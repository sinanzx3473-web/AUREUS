// IPFS support removed - ipfs-http-client deprecated
// Use Arweave for decentralized storage or implement alternative IPFS solution
import Arweave from 'arweave';
import { logger } from '../utils/logger';

// IPFS Configuration (validated in initializeClients based on STORAGE_TYPE)
const IPFS_HOST = process.env.IPFS_HOST;
const IPFS_PORT = parseInt(process.env.IPFS_PORT || '5001');
const IPFS_PROTOCOL = process.env.IPFS_PROTOCOL || 'https';
const IPFS_PROJECT_ID = process.env.IPFS_PROJECT_ID;
const IPFS_PROJECT_SECRET = process.env.IPFS_PROJECT_SECRET;
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';

// Arweave Configuration (validated in initializeClients based on STORAGE_TYPE)
const ARWEAVE_HOST = process.env.ARWEAVE_HOST;
const ARWEAVE_PORT = parseInt(process.env.ARWEAVE_PORT || '443');
const ARWEAVE_PROTOCOL = process.env.ARWEAVE_PROTOCOL || 'https';
const ARWEAVE_WALLET_KEY = process.env.ARWEAVE_WALLET_KEY;

export interface MetadataUpload {
  name: string;
  description: string;
  image?: string;
  attributes?: Record<string, any>;
  [key: string]: any;
}

export interface StorageResult {
  cid?: string;
  arweaveId?: string;
  url: string;
  gateway: string;
}

class StorageService {
  // private ipfsClient: IPFSHTTPClient | null = null; // IPFS client removed
  private arweave: Arweave | null = null;
  private storageType: 'arweave';

  constructor() {
    this.storageType = 'arweave'; // IPFS support removed due to deprecated dependencies
    this.initializeClients();
  }

  private initializeClients() {
    try {
      // IPFS initialization removed - deprecated ipfs-http-client
      // To re-enable IPFS, implement alternative solution (e.g., Helia, Pinata API, etc.)
      if (false) {
        if (!IPFS_HOST) {
          throw new Error('IPFS_HOST environment variable is required for IPFS storage');
        }

        // IPFS client initialization removed - use alternative solution
        logger.warn('IPFS support disabled - ipfs-http-client deprecated');
      }

      // Initialize Arweave
      if (this.storageType === 'arweave') {
        if (!ARWEAVE_HOST) {
          throw new Error('ARWEAVE_HOST environment variable is required for Arweave storage');
        }

        this.arweave = Arweave.init({
          host: ARWEAVE_HOST,
          port: ARWEAVE_PORT,
          protocol: ARWEAVE_PROTOCOL,
        });

        logger.info('Arweave client initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize storage clients', error);
    }
  }

  /**
   * Upload metadata to IPFS (DEPRECATED)
   * IPFS support removed due to deprecated ipfs-http-client library
   * Use uploadToArweave() or implement alternative IPFS solution (Helia, Pinata API, etc.)
   */
  async uploadToIPFS(metadata: MetadataUpload): Promise<StorageResult> {
    throw new Error('IPFS support removed - use uploadToArweave() or implement alternative solution');
  }

  /**
   * Upload metadata to Arweave
   */
  async uploadToArweave(metadata: MetadataUpload): Promise<StorageResult> {
    if (!this.arweave || !ARWEAVE_WALLET_KEY) {
      throw new Error('Arweave client not initialized or wallet key missing');
    }

    try {
      const wallet = JSON.parse(ARWEAVE_WALLET_KEY);
      const data = JSON.stringify(metadata);

      const transaction = await this.arweave.createTransaction(
        { data },
        wallet
      );

      transaction.addTag('Content-Type', 'application/json');
      transaction.addTag('App-Name', 'Takumi');
      transaction.addTag('Type', 'Skill-Metadata');

      await this.arweave.transactions.sign(transaction, wallet);
      await this.arweave.transactions.post(transaction);

      const arweaveId = transaction.id;
      const gateway = `https://arweave.net`;

      logger.info(`Metadata uploaded to Arweave: ${arweaveId}`);

      return {
        arweaveId,
        url: `ar://${arweaveId}`,
        gateway: `${gateway}/${arweaveId}`,
      };
    } catch (error) {
      logger.error('Failed to upload to Arweave', error);
      throw new Error('Arweave upload failed');
    }
  }

  /**
   * Upload file to IPFS (DEPRECATED)
   * IPFS support removed due to deprecated ipfs-http-client library
   */
  async uploadFileToIPFS(file: Buffer, filename: string): Promise<StorageResult> {
    throw new Error('IPFS support removed - use alternative solution');
  }

  /**
   * Upload metadata to configured storage (Arweave only)
   * IPFS support removed - use Arweave for decentralized storage
   */
  async uploadMetadata(metadata: MetadataUpload): Promise<StorageResult> {
    try {
      return await this.uploadToArweave(metadata);
    } catch (error) {
      logger.error('Failed to upload metadata', error);
      throw error;
    }
  }

  /**
   * Retrieve metadata from IPFS (DEPRECATED)
   * IPFS support removed due to deprecated ipfs-http-client library
   */
  async getFromIPFS(cid: string): Promise<any> {
    throw new Error('IPFS support removed - use getFromArweave() or implement alternative solution');
  }

  /**
   * Retrieve metadata from Arweave
   */
  async getFromArweave(txId: string): Promise<any> {
    if (!this.arweave) {
      throw new Error('Arweave client not initialized');
    }

    try {
      const response = await this.arweave.transactions.getData(txId, {
        decode: true,
        string: true,
      });

      return JSON.parse(response as string);
    } catch (error) {
      logger.error(`Failed to retrieve from Arweave: ${txId}`, error);
      throw new Error('Arweave retrieval failed');
    }
  }

  /**
   * Pin content to IPFS (DEPRECATED)
   * IPFS support removed due to deprecated ipfs-http-client library
   */
  async pinToIPFS(cid: string): Promise<void> {
    throw new Error('IPFS support removed - use alternative solution');
  }
}

export default new StorageService();
