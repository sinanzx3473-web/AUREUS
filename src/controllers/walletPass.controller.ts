import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import walletPassService from '../services/walletPass.service';
import { logger } from '../utils/logger';

/**
 * Check if user is eligible for Black Card
 */
export const checkEligibility = asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.params;
  
  if (!address) {
    throw new AppError('Wallet address is required', 400);
  }
  
  const isEligible = await walletPassService.isEligibleForBlackCard(address);
  
  res.json({
    success: true,
    data: {
      eligible: isEligible,
      tierRequired: 3,
      tierName: 'Gold'
    }
  });
});

/**
 * Generate and download Black Card wallet pass
 */
export const downloadBlackCard = asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.params;
  
  if (!address) {
    throw new AppError('Wallet address is required', 400);
  }
  
  try {
    // Generate the .pkpass file
    const passBuffer = await walletPassService.generateBlackCard(address);
    
    // Record the download
    await walletPassService.recordPassDownload(address);
    
    // Set headers for .pkpass download
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="aureus-black-card.pkpass"`);
    res.setHeader('Content-Length', passBuffer.length);
    
    // Send the file
    res.send(passBuffer);
    
    logger.info(`Black Card downloaded by ${address}`);
  } catch (error: any) {
    logger.error('Error generating Black Card:', error);
    throw new AppError(error.message || 'Failed to generate Black Card', 500);
  }
});

/**
 * Verify ZK-proof token from QR code scan
 */
export const verifyQRCode = asyncHandler(async (req: Request, res: Response) => {
  const { zkToken } = req.body;
  
  if (!zkToken) {
    throw new AppError('ZK proof token is required', 400);
  }
  
  const verification = await walletPassService.verifyZKProofToken(zkToken);
  
  if (!verification.valid) {
    res.json({
      success: true,
      data: {
        valid: false,
        message: 'Invalid or expired proof token'
      }
    });
    return;
  }
  
  // Log the verification (optional: include event details)
  const { eventName, eventLocation, verifierId } = req.body;
  
  if (eventName) {
    const { query } = await import('../config/database');
    await query(
      `INSERT INTO wallet_pass_verifications (commitment, event_name, event_location, verifier_id)
       VALUES ($1, $2, $3, $4)`,
      [
        JSON.parse(Buffer.from(zkToken, 'base64').toString('utf-8')).proof,
        eventName,
        eventLocation || null,
        verifierId || null
      ]
    );
  }
  
  res.json({
    success: true,
    data: {
      valid: true,
      tierLevel: verification.tierLevel,
      message: `Verified Gold Tier (Level ${verification.tierLevel}) developer`,
      // Note: We do NOT return the wallet address to preserve privacy
      // Only return it if explicitly needed for the use case
    }
  });
});

/**
 * Get wallet pass statistics for user
 */
export const getPassStats = asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.params;
  
  if (!address) {
    throw new AppError('Wallet address is required', 400);
  }
  
  const { query } = await import('../config/database');
  
  // Get download count
  const downloadResult = await query(
    `SELECT COUNT(*) as download_count, MAX(downloaded_at) as last_download
     FROM wallet_pass_downloads
     WHERE wallet_address = $1`,
    [address.toLowerCase()]
  );
  
  // Get verification count (scans at events)
  const verificationResult = await query(
    `SELECT COUNT(*) as scan_count
     FROM wallet_pass_verifications wpv
     JOIN wallet_pass_proofs wpp ON wpv.commitment = wpp.commitment
     WHERE wpp.wallet_address = $1`,
    [address.toLowerCase()]
  );
  
  res.json({
    success: true,
    data: {
      downloads: parseInt(downloadResult.rows[0]?.download_count || '0'),
      lastDownload: downloadResult.rows[0]?.last_download,
      eventScans: parseInt(verificationResult.rows[0]?.scan_count || '0')
    }
  });
});
