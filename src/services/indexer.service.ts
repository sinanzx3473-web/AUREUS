import { ethers } from 'ethers';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { webhookService, WEBHOOK_EVENTS } from './webhook.service';
import { emailService } from './email.service';
import { NotificationService } from './notification.service';
import { indexerEventsTotal, indexerBlockHeight, indexerErrorsTotal } from '../routes/metrics.routes';
import * as fs from 'fs';
import * as path from 'path';

const notificationService = new NotificationService();

export class IndexerService {
  private provider: ethers.JsonRpcProvider;
  private contracts: Map<string, ethers.Contract>;
  private isRunning: boolean = false;

  constructor() {
    const rpcUrl = process.env.RPC_URL_SEPOLIA || '';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contracts = new Map();
  }

  /**
   * Initialize contract listeners
   */
  async initialize() {
    try {
      // Load metadata.json from contracts/interfaces
      const metadataPath = path.join(__dirname, '../../../contracts/interfaces/metadata.json');
      
      if (!fs.existsSync(metadataPath)) {
        logger.warn('metadata.json not found, skipping contract initialization');
        return;
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      const chain = metadata.chains.find((c: any) => c.network === 'devnet');

      if (!chain) {
        logger.warn('No devnet chain found in metadata');
        return;
      }

      // Initialize contracts with ABIs from metadata
      for (const contractData of chain.contracts) {
        const contract = new ethers.Contract(
          contractData.address,
          contractData.abi,
          this.provider
        );
        this.contracts.set(contractData.contractName, contract);
        logger.info(`Initialized contract: ${contractData.contractName} at ${contractData.address}`);
      }

      logger.info('Indexer service initialized');
    } catch (error) {
      logger.error('Failed to initialize indexer', error);
      throw error;
    }
  }

  /**
   * Start indexing from last known block
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Indexer already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting indexer service');

    try {
      await this.syncHistoricalEvents();
      await this.startRealtimeIndexing();
    } catch (error) {
      logger.error('Indexer error', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Sync historical events from last indexed block
   */
  private async syncHistoricalEvents() {
    const batchSize = parseInt(process.env.INDEXER_BATCH_SIZE || '1000');
    const currentBlock = await this.provider.getBlockNumber();

    for (const [name, contract] of this.contracts) {
      const address = await contract.getAddress();
      
      // Get last indexed block for this contract
      const stateResult = await query(
        'SELECT last_indexed_block FROM indexer_state WHERE contract_address = $1',
        [address]
      );

      let lastBlock = parseInt(process.env.INDEXER_START_BLOCK || '0');
      if (stateResult.rows.length > 0) {
        lastBlock = stateResult.rows[0].last_indexed_block;
      }

      logger.info(`Syncing ${name} from block ${lastBlock} to ${currentBlock}`);

      // Process in batches
      for (let fromBlock = lastBlock + 1; fromBlock <= currentBlock; fromBlock += batchSize) {
        const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);
        
        try {
          await this.processBlockRange(name, contract, fromBlock, toBlock);
          
          // Update indexer state
          await this.updateIndexerState(address, toBlock);
          
          logger.info(`Processed ${name} blocks ${fromBlock}-${toBlock}`);
        } catch (error) {
          logger.error(`Error processing blocks ${fromBlock}-${toBlock}`, error);
          await this.recordIndexerError(address, error);
          throw error;
        }
      }
    }

    logger.info('Historical sync completed');
  }

  /**
   * Process events in a block range
   */
  private async processBlockRange(
    contractName: string,
    contract: ethers.Contract,
    fromBlock: number,
    toBlock: number
  ) {
    const filter = {
      address: await contract.getAddress(),
      fromBlock,
      toBlock,
    };

    const logs = await this.provider.getLogs(filter);

    for (const log of logs) {
      try {
        await this.processLog(contractName, log);
      } catch (error) {
        logger.error('Error processing log', { log, error });
      }
    }
  }

  /**
   * Process individual log entry
   */
  private async processLog(contractName: string, log: ethers.Log) {
    const contract = this.contracts.get(contractName);
    if (!contract) return;

    try {
      const parsedLog = contract.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });

      if (!parsedLog) return;

      const eventData = {
        contractName,
        eventName: parsedLog.name,
        args: parsedLog.args,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.index,
      };

      // Store raw event
      await this.storeBlockchainEvent(eventData);

      // Process specific event types
      await this.processEventByType(contractName, eventData);
    } catch (error) {
      logger.error('Error parsing log', { contractName, error });
    }
  }

  /**
   * Store blockchain event in database
   */
  private async storeBlockchainEvent(eventData: any) {
    const contract = this.contracts.get(eventData.contractName);
    const contractAddress = contract ? await contract.getAddress() : '';

    await query(
      `INSERT INTO blockchain_events 
       (event_name, contract_address, block_number, transaction_hash, log_index, event_data, processed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (transaction_hash, log_index) DO NOTHING`,
      [
        eventData.eventName || eventData.contractName,
        contractAddress,
        eventData.blockNumber,
        eventData.transactionHash,
        eventData.logIndex,
        JSON.stringify(eventData),
        false,
      ]
    );
  }

  /**
   * Process events by type and update database
   */
  private async processEventByType(contractName: string, eventData: any) {
    const { eventName, args, blockNumber, transactionHash } = eventData;

    try {
      switch (contractName) {
        case 'SkillProfile':
          await this.handleProfileEvents(eventName, args, blockNumber, transactionHash);
          break;
        case 'SkillClaim':
          await this.handleSkillClaimEvents(eventName, args, blockNumber, transactionHash);
          break;
        case 'Endorsement':
          await this.handleEndorsementEvents(eventName, args, blockNumber, transactionHash);
          break;
        case 'VerifierRegistry':
          await this.handleVerifierEvents(eventName, args, blockNumber, transactionHash);
          break;
        case 'BountyVault':
          await this.handleBountyVaultEvents(eventName, args, blockNumber, transactionHash);
          break;
      }

      // Mark event as processed
      await query(
        'UPDATE blockchain_events SET processed = true WHERE transaction_hash = $1 AND log_index = $2',
        [transactionHash, eventData.logIndex]
      );

      // Record metrics
      indexerEventsTotal.inc({ contract: contractName, event_type: eventName });

      // Record metrics
      indexerEventsTotal.inc({ contract: contractName, event_type: eventName });
    } catch (error) {
      logger.error('Error processing event', { contractName, eventName, error });
    }
  }

  /**
   * Handle SkillProfile contract events
   */
  private async handleProfileEvents(
    eventName: string,
    args: any,
    blockNumber: number,
    transactionHash: string
  ) {
    switch (eventName) {
      case 'ProfileCreated':
        await query(
          `INSERT INTO profiles (wallet_address, profile_id, name, bio, metadata, block_number, transaction_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (wallet_address) DO NOTHING`,
          [
            args.user.toLowerCase(),
            0, // Profile ID would come from contract state
            args.name || '',
            '',
            JSON.stringify({}),
            blockNumber,
            transactionHash,
          ]
        );

        // Send webhook notification
        await webhookService.sendWebhook(WEBHOOK_EVENTS.PROFILE_CREATED, {
          user: args.user.toLowerCase(),
          name: args.name,
          blockNumber,
          transactionHash,
        });

        logger.info('Profile created event processed', { user: args.user, name: args.name });
        break;

      case 'SkillAdded':
        const profileResult = await query(
          'SELECT profile_id, name FROM profiles WHERE wallet_address = $1',
          [args.user.toLowerCase()]
        );
        
        if (profileResult.rows.length > 0) {
          await query(
            `INSERT INTO skills (profile_id, skill_id, skill_name, category, metadata, block_number, transaction_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (skill_id) DO NOTHING`,
            [
              profileResult.rows[0].profile_id,
              0, // Skill ID from contract
              args.skillName || '',
              '',
              JSON.stringify({ proficiencyLevel: args.proficiencyLevel }),
              blockNumber,
              transactionHash,
            ]
          );

          // Send webhook notification
          await webhookService.sendWebhook(WEBHOOK_EVENTS.SKILL_ADDED, {
            user: args.user.toLowerCase(),
            skillName: args.skillName,
            proficiencyLevel: args.proficiencyLevel,
            blockNumber,
            transactionHash,
          });

          // Create in-app notification
          await notificationService.createNotification(
            profileResult.rows[0].profile_id,
            'skill_added',
            `New skill added: ${args.skillName}`,
            JSON.stringify({ skillName: args.skillName, transactionHash })
          );

          logger.info('Skill added event processed', { user: args.user, skillName: args.skillName });
        }
        break;

      case 'SkillVerified':
        const skillResult = await query(
          `UPDATE skills SET is_verified = true, verified_at = NOW(), verified_by = $1
           WHERE skill_id = $2
           RETURNING profile_id, skill_name`,
          [args.verifier?.toLowerCase(), args.skillIndex]
        );

        if (skillResult.rows.length > 0) {
          const skill = skillResult.rows[0];
          
          // Get verifier info
          const verifierResult = await query(
            'SELECT name FROM verifiers WHERE verifier_address = $1',
            [args.verifier?.toLowerCase()]
          );

          // Send webhook notification
          await webhookService.sendWebhook(WEBHOOK_EVENTS.SKILL_VERIFIED, {
            skillName: skill.skill_name,
            verifier: args.verifier?.toLowerCase(),
            verifierName: verifierResult.rows[0]?.name,
            blockNumber,
            transactionHash,
          });

          // Create in-app notification
          await notificationService.createNotification(
            skill.profile_id,
            'skill_verified',
            `Your skill "${skill.skill_name}" has been verified!`,
            JSON.stringify({ skillName: skill.skill_name, verifier: args.verifier, transactionHash })
          );

          logger.info('Skill verified event processed', { skillName: skill.skill_name, verifier: args.verifier });
        }
        break;
    }
  }

  /**
   * Handle SkillClaim contract events
   */
  private async handleSkillClaimEvents(
    eventName: string,
    args: any,
    blockNumber: number,
    transactionHash: string
  ) {
    switch (eventName) {
      case 'ClaimCreated':
        const profileResult = await query(
          'SELECT profile_id FROM profiles WHERE wallet_address = $1',
          [args.claimant.toLowerCase()]
        );

        if (profileResult.rows.length > 0) {
          await query(
            `INSERT INTO skills (profile_id, skill_id, skill_name, description, evidence_url, metadata, block_number, transaction_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (skill_id) DO NOTHING`,
            [
              profileResult.rows[0].profile_id,
              args.claimId,
              args.skillName || '',
              '',
              '',
              JSON.stringify({ claimId: args.claimId.toString() }),
              blockNumber,
              transactionHash,
            ]
          );
        }
        break;

      case 'ClaimApproved':
        await query(
          `UPDATE skills SET is_verified = true, verified_at = NOW(), verified_by = $1
           WHERE metadata->>'claimId' = $2`,
          [args.verifier?.toLowerCase(), args.claimId.toString()]
        );
        break;
    }
  }

  /**
   * Handle Endorsement contract events
   */
  private async handleEndorsementEvents(
    eventName: string,
    args: any,
    blockNumber: number,
    transactionHash: string
  ) {
    switch (eventName) {
      case 'EndorsementCreated':
        const endorseeProfile = await query(
          'SELECT profile_id, name, email FROM profiles WHERE wallet_address = $1',
          [args.endorsee.toLowerCase()]
        );

        const endorserProfile = await query(
          'SELECT profile_id, name FROM profiles WHERE wallet_address = $1',
          [args.endorser.toLowerCase()]
        );

        if (endorseeProfile.rows.length > 0) {
          // Find skill by name for this profile
          const skillResult = await query(
            'SELECT skill_id FROM skills WHERE profile_id = $1 AND skill_name = $2 LIMIT 1',
            [endorseeProfile.rows[0].profile_id, args.skillName]
          );

          if (skillResult.rows.length > 0) {
            await query(
              `INSERT INTO endorsements (endorsement_id, skill_id, endorser_address, endorser_profile_id, comment, metadata, block_number, transaction_hash)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (endorsement_id) DO NOTHING`,
              [
                args.endorsementId,
                skillResult.rows[0].skill_id,
                args.endorser.toLowerCase(),
                endorserProfile.rows.length > 0 ? endorserProfile.rows[0].profile_id : null,
                args.message || '',
                JSON.stringify({}),
                blockNumber,
                transactionHash,
              ]
            );

            // Send webhook notification
            await webhookService.sendWebhook(WEBHOOK_EVENTS.ENDORSEMENT_CREATED, {
              endorsee: args.endorsee.toLowerCase(),
              endorser: args.endorser.toLowerCase(),
              skillName: args.skillName,
              message: args.message,
              blockNumber,
              transactionHash,
            });

            // Send email notification if email is available
            if (endorseeProfile.rows[0].email) {
              await emailService.sendEndorsementRequest(
                {
                  endorseeName: endorseeProfile.rows[0].name,
                  endorseeAddress: args.endorsee.toLowerCase(),
                  endorserName: endorserProfile.rows[0]?.name || 'Anonymous',
                  endorserAddress: args.endorser.toLowerCase(),
                  skillName: args.skillName,
                  message: args.message,
                },
                endorseeProfile.rows[0].email
              );
            }

            // Create in-app notification
            await notificationService.createNotification(
              endorseeProfile.rows[0].profile_id,
              'endorsement_received',
              `${endorserProfile.rows[0]?.name || 'Someone'} endorsed your skill: ${args.skillName}`,
              JSON.stringify({ skillName: args.skillName, endorser: args.endorser, message: args.message, transactionHash })
            );

            logger.info('Endorsement created event processed', {
              endorsee: args.endorsee,
              endorser: args.endorser,
              skillName: args.skillName,
            });
          }
        }
        break;
    }
  }

  /**
   * Handle VerifierRegistry contract events
   */
  private async handleVerifierEvents(
    eventName: string,
    args: any,
    blockNumber: number,
    transactionHash: string
  ) {
    switch (eventName) {
      case 'VerifierRegistered':
        await query(
          `INSERT INTO verifiers (verifier_address, name, organization, metadata, block_number, transaction_hash)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (verifier_address) DO NOTHING`,
          [
            args.verifier.toLowerCase(),
            args.name || '',
            args.organization || '',
            JSON.stringify({}),
            blockNumber,
            transactionHash,
          ]
        );
        break;

      case 'VerifierStatusChanged':
        await query(
          'UPDATE verifiers SET is_active = $1 WHERE verifier_address = $2',
          [args.newStatus === 1, args.verifier.toLowerCase()]
        );
        break;
    }
  }

  /**
   * Handle BountyVault contract events
   */
  private async handleBountyVaultEvents(
    eventName: string,
    args: any,
    blockNumber: number,
    transactionHash: string
  ) {
    switch (eventName) {
      case 'BountyClaimed':
        const profileResult = await query(
          'SELECT profile_id, name, email FROM profiles WHERE wallet_address = $1',
          [args.claimant.toLowerCase()]
        );

        if (profileResult.rows.length > 0) {
          // Record bounty claim in database
          await query(
            `INSERT INTO bounty_claims (profile_id, skill_name, amount, claim_id, block_number, transaction_hash, claimed_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (transaction_hash, claim_id) DO NOTHING`,
            [
              profileResult.rows[0].profile_id,
              args.skillName || '',
              args.amount.toString(),
              args.claimId?.toString() || '0',
              blockNumber,
              transactionHash,
            ]
          );

          // Send webhook notification
          await webhookService.sendWebhook(WEBHOOK_EVENTS.BOUNTY_CLAIMED, {
            claimant: args.claimant.toLowerCase(),
            skillName: args.skillName,
            amount: args.amount.toString(),
            blockNumber,
            transactionHash,
          });

          // Create in-app notification
          await notificationService.createNotification(
            profileResult.rows[0].profile_id,
            'bounty_claimed',
            `You claimed ${ethers.formatUnits(args.amount, 6)} USDC bounty for ${args.skillName}!`,
            JSON.stringify({ skillName: args.skillName, amount: args.amount.toString(), transactionHash })
          );

          // Send email notification if available
          if (profileResult.rows[0].email) {
            await emailService.sendBountyClaimNotification(
              {
                userName: profileResult.rows[0].name,
                skillName: args.skillName,
                amount: ethers.formatUnits(args.amount, 6),
                transactionHash,
              },
              profileResult.rows[0].email
            );
          }

          logger.info('Bounty claimed event processed', {
            claimant: args.claimant,
            skillName: args.skillName,
            amount: args.amount.toString(),
          });
        }
        break;

      case 'PoolCreated':
        await query(
          `INSERT INTO bounty_pools (skill_name, monthly_bounty, total_deposited, is_active, block_number, transaction_hash)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (skill_name) DO UPDATE SET
             monthly_bounty = $2,
             total_deposited = bounty_pools.total_deposited + $3,
             is_active = $4`,
          [
            args.skillName || '',
            args.monthlyBounty.toString(),
            '0',
            true,
            blockNumber,
            transactionHash,
          ]
        );

        logger.info('Bounty pool created', { skillName: args.skillName, monthlyBounty: args.monthlyBounty.toString() });
        break;

      case 'Deposited':
        await query(
          `UPDATE bounty_pools 
           SET total_deposited = total_deposited + $1
           WHERE skill_name = $2`,
          [args.amount.toString(), args.skillName]
        );

        logger.info('Bounty deposited', { skillName: args.skillName, amount: args.amount.toString() });
        break;

      case 'PoolDeactivated':
        await query(
          `UPDATE bounty_pools SET is_active = false WHERE skill_name = $1`,
          [args.skillName]
        );

        logger.info('Bounty pool deactivated', { skillName: args.skillName });
        break;
    }
  }

  /**
   * Start real-time event monitoring
   */
  private async startRealtimeIndexing() {
    const pollInterval = parseInt(process.env.INDEXER_POLL_INTERVAL || '12000');

    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.syncHistoricalEvents();
      } catch (error) {
        logger.error('Real-time indexing error', error);
      }
    }, pollInterval);

    logger.info('Real-time indexing started');
  }

  /**
   * Update indexer state
   */
  private async updateIndexerState(contractAddress: string, blockNumber: number) {
    await query(
      `INSERT INTO indexer_state (contract_address, last_indexed_block, last_indexed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (contract_address) 
       DO UPDATE SET last_indexed_block = $2, last_indexed_at = NOW(), is_syncing = false`,
      [contractAddress, blockNumber]
    );

    // Update Prometheus metrics
    indexerBlockHeight.set({ chain: 'devnet' }, blockNumber);
  }

  /**
   * Record indexer error
   */
  private async recordIndexerError(contractAddress: string, error: any) {
    await query(
      `UPDATE indexer_state 
       SET error_count = error_count + 1, last_error = $2
       WHERE contract_address = $1`,
      [contractAddress, error.message]
    );

    // Record error metric
    indexerErrorsTotal.inc({ type: 'indexer_error' });
  }

  /**
   * Stop indexer
   */
  stop() {
    this.isRunning = false;
    logger.info('Indexer service stopped');
  }
}

export default new IndexerService();
