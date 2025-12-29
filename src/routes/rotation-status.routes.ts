import { Router, Request, Response } from 'express';
import { getRotationStatus } from '../middleware/jwtRotation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/rotation/status
 * 
 * Returns JWT rotation status for monitoring and debugging.
 * Requires admin authentication.
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    // Verify admin access (check admin API key)
    const adminApiKey = req.headers['x-admin-api-key'];
    
    if (adminApiKey !== process.env.ADMIN_API_KEY) {
      logger.warn('Unauthorized rotation status access attempt', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
      });
    }

    const status = getRotationStatus();
    
    logger.info('Rotation status queried', {
      gracePeriodActive: status.gracePeriodActive,
      ip: req.ip,
    });

    res.json({
      status: 'success',
      data: {
        gracePeriodActive: status.gracePeriodActive,
        secretsConfigured: {
          current: status.hasCurrentSecret,
          previous: status.hasPreviousSecret,
          currentRefresh: status.hasCurrentRefreshSecret,
          previousRefresh: status.hasPreviousRefreshSecret,
        },
        recommendation: status.gracePeriodActive
          ? 'Grace period active - old tokens still valid for 48 hours'
          : 'No rotation in progress',
      },
    });
  } catch (error) {
    logger.error('Error fetching rotation status', { error });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch rotation status',
    });
  }
});

export default router;
