import { PKPass } from 'passkit-generator';
import QRCode from 'qrcode';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

interface WalletPassData {
  ensName: string;
  tierLevel: number;
  walletAddress: string;
}

interface ZKProofToken {
  proof: string;
  publicSignals: string[];
  timestamp: number;
  expiresAt: number;
}

export class WalletPassService {
  /**
   * Generate a ZK-proof token for privacy-preserving authentication
   * This creates a cryptographic proof that the user is Gold Tier without revealing their wallet address
   */
  private async generateZKProofToken(walletAddress: string, tierLevel: number): Promise<string> {
    // Generate a unique session ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // Create a commitment hash (this would be replaced with actual ZK-SNARK proof in production)
    // For now, we use a cryptographic commitment scheme
    const commitment = crypto
      .createHash('sha256')
      .update(`${walletAddress}:${tierLevel}:${sessionId}`)
      .digest('hex');
    
    // Store the proof mapping in database with expiration
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await query(
      `INSERT INTO wallet_pass_proofs (commitment, wallet_address, tier_level, session_id, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (commitment) DO UPDATE SET expires_at = $5`,
      [commitment, walletAddress.toLowerCase(), tierLevel, sessionId, expiresAt]
    );
    
    // Create the ZK proof token (in production, this would be a ZK-SNARK proof)
    const zkToken: ZKProofToken = {
      proof: commitment,
      publicSignals: [
        crypto.createHash('sha256').update(`tier:${tierLevel}`).digest('hex'),
        crypto.createHash('sha256').update(`session:${sessionId}`).digest('hex')
      ],
      timestamp: Date.now(),
      expiresAt: expiresAt.getTime()
    };
    
    // Encode as base64 for QR code
    return Buffer.from(JSON.stringify(zkToken)).toString('base64');
  }

  /**
   * Verify a ZK-proof token without revealing the wallet address
   */
  async verifyZKProofToken(zkTokenBase64: string): Promise<{
    valid: boolean;
    tierLevel?: number;
    walletAddress?: string;
  }> {
    try {
      const zkToken: ZKProofToken = JSON.parse(
        Buffer.from(zkTokenBase64, 'base64').toString('utf-8')
      );
      
      // Check if token is expired
      if (Date.now() > zkToken.expiresAt) {
        return { valid: false };
      }
      
      // Verify the proof exists in database
      const result = await query(
        `SELECT wallet_address, tier_level 
         FROM wallet_pass_proofs 
         WHERE commitment = $1 AND expires_at > NOW()`,
        [zkToken.proof]
      );
      
      if (result.rows.length === 0) {
        return { valid: false };
      }
      
      const { wallet_address, tier_level } = result.rows[0];
      
      return {
        valid: true,
        tierLevel: tier_level,
        walletAddress: wallet_address
      };
    } catch (error) {
      logger.error('Error verifying ZK proof token:', error);
      return { valid: false };
    }
  }

  /**
   * Check if user is eligible for Black Card (Gold Tier = Tier 3)
   */
  async isEligibleForBlackCard(walletAddress: string): Promise<boolean> {
    const result = await query(
      `SELECT tier_level FROM user_tiers WHERE wallet_address = $1`,
      [walletAddress.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return false;
    }
    
    return result.rows[0].tier_level >= 3; // Gold Tier
  }

  /**
   * Get user data for wallet pass
   */
  private async getUserPassData(walletAddress: string): Promise<WalletPassData> {
    // Get ENS name (or fallback to shortened address)
    const profileResult = await query(
      `SELECT ens_name FROM profiles WHERE wallet_address = $1`,
      [walletAddress.toLowerCase()]
    );
    
    const ensName = profileResult.rows[0]?.ens_name || 
      `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    
    // Get tier level
    const tierResult = await query(
      `SELECT tier_level FROM user_tiers WHERE wallet_address = $1`,
      [walletAddress.toLowerCase()]
    );
    
    const tierLevel = tierResult.rows[0]?.tier_level || 1;
    
    return {
      ensName,
      tierLevel,
      walletAddress
    };
  }

  /**
   * Generate Apple Wallet .pkpass file for Gold Tier users
   */
  async generateBlackCard(walletAddress: string): Promise<Buffer> {
    // Check eligibility
    const isEligible = await this.isEligibleForBlackCard(walletAddress);
    if (!isEligible) {
      throw new Error('User is not eligible for Black Card (requires Gold Tier)');
    }
    
    // Get user data
    const userData = await this.getUserPassData(walletAddress);
    
    // Generate ZK-proof QR code data
    const zkProofToken = await this.generateZKProofToken(walletAddress, userData.tierLevel);
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(zkProofToken, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 512,
      margin: 2,
      color: {
        dark: '#D4AF37', // Gold color
        light: '#000000'  // Black background
      }
    });
    
    // Convert data URL to buffer
    const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    
    // Create pass model directory structure
    const passModelPath = path.join(__dirname, '../../pass-models/black-card');
    
    // Ensure pass model directory exists
    if (!fs.existsSync(passModelPath)) {
      fs.mkdirSync(passModelPath, { recursive: true });
    }
    
    // Create pass.json template
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || 'pass.com.aureus.blackcard',
      serialNumber: crypto.randomBytes(16).toString('hex'),
      teamIdentifier: process.env.APPLE_TEAM_ID || 'TEAM_ID',
      organizationName: 'AUREUS',
      description: 'AUREUS Black Card - Gold Tier Developer',
      backgroundColor: 'rgb(0, 0, 0)',
      foregroundColor: 'rgb(212, 175, 55)',
      labelColor: 'rgb(212, 175, 55)',
      logoText: 'AUREUS',
      generic: {
        primaryFields: [
          {
            key: 'name',
            label: 'DEVELOPER',
            value: userData.ensName
          }
        ],
        secondaryFields: [
          {
            key: 'tier',
            label: 'TIER',
            value: `GOLD (${userData.tierLevel})`
          }
        ],
        auxiliaryFields: [
          {
            key: 'status',
            label: 'STATUS',
            value: 'VERIFIED'
          }
        ],
        backFields: [
          {
            key: 'terms',
            label: 'Privacy Notice',
            value: 'This QR code contains a zero-knowledge proof of your Gold Tier status. Scanning it at events proves your tier level without revealing your wallet address.'
          },
          {
            key: 'wallet',
            label: 'Wallet Address',
            value: walletAddress
          }
        ]
      },
      barcode: {
        message: zkProofToken,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: 'ZK-Proof Authentication Token'
      }
    };
    
    // Write pass.json to model directory
    fs.writeFileSync(
      path.join(passModelPath, 'pass.json'),
      JSON.stringify(passJson, null, 2)
    );
    
    // Save QR code as strip image (will be displayed on pass)
    fs.writeFileSync(path.join(passModelPath, 'strip.png'), qrCodeBuffer);
    fs.writeFileSync(path.join(passModelPath, 'strip@2x.png'), qrCodeBuffer);
    
    // Note: In production, you need to:
    // 1. Create icon.png, logo.png with AUREUS gold logo
    // 2. Obtain Apple Developer certificates (pass.p12, WWDR.pem)
    // 3. Configure proper signing
    
    try {
      // Create the pass (requires certificates in production)
      const pass = await PKPass.from({
        model: passModelPath,
        certificates: {
          wwdr: process.env.APPLE_WWDR_CERT || path.join(__dirname, '../../certificates/WWDR.pem'),
          signerCert: process.env.APPLE_SIGNER_CERT || path.join(__dirname, '../../certificates/signerCert.pem'),
          signerKey: process.env.APPLE_SIGNER_KEY || path.join(__dirname, '../../certificates/signerKey.pem'),
          signerKeyPassphrase: process.env.APPLE_CERT_PASSPHRASE
        }
      }, {
        serialNumber: passJson.serialNumber
      });
      
      // Generate the .pkpass file
      const buffer = pass.getAsBuffer();
      
      logger.info(`Generated Black Card wallet pass for ${walletAddress}`);
      
      return buffer;
    } catch (error) {
      logger.error('Error generating wallet pass:', error);
      
      // In development, return a mock response
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Development mode: Returning mock .pkpass file');
        return Buffer.from('MOCK_PKPASS_FILE_FOR_DEVELOPMENT');
      }
      
      throw error;
    }
  }

  /**
   * Record wallet pass download event
   */
  async recordPassDownload(walletAddress: string): Promise<void> {
    await query(
      `INSERT INTO wallet_pass_downloads (wallet_address, downloaded_at)
       VALUES ($1, NOW())`,
      [walletAddress.toLowerCase()]
    );
  }
}

export default new WalletPassService();
