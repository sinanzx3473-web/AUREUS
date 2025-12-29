import { Router } from 'express';
import {
  checkEligibility,
  downloadBlackCard,
  verifyQRCode,
  getPassStats
} from '../controllers/walletPass.controller';
import { authenticateApiKey } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/v1/wallet-pass/:address/eligibility
 * @desc    Check if user is eligible for Black Card (Gold Tier)
 * @access  Public
 */
router.get('/:address/eligibility', checkEligibility);

/**
 * @route   GET /api/v1/wallet-pass/:address/download
 * @desc    Generate and download Black Card .pkpass file
 * @access  Public (but requires Gold Tier)
 */
router.get('/:address/download', downloadBlackCard);

/**
 * @route   POST /api/v1/wallet-pass/verify
 * @desc    Verify ZK-proof token from QR code scan at events
 * @access  Public (for event organizers)
 * @body    { zkToken: string, eventName?: string, eventLocation?: string, verifierId?: string }
 */
router.post('/verify', verifyQRCode);

/**
 * @route   GET /api/v1/wallet-pass/:address/stats
 * @desc    Get wallet pass statistics (downloads, scans)
 * @access  Public
 */
router.get('/:address/stats', getPassStats);

export default router;
