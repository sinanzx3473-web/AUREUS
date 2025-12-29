import { Router } from 'express';
import {
  getNonce,
  verifySignature,
  refreshToken,
  logout,
} from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply rate limiting to auth routes
router.use(authLimiter);

/**
 * @route   GET /api/v1/auth/nonce/:address
 * @desc    Get nonce for wallet signature
 * @access  Public
 */
router.get('/nonce/:address', getNonce);

/**
 * @route   POST /api/v1/auth/verify
 * @desc    Verify wallet signature and get JWT
 * @access  Public
 */
router.post('/verify', verifySignature);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', logout);

export default router;
