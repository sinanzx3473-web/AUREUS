import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import verifierAgentService from '../services/verifierAgent.service';
import { logger } from '../utils/logger';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * POST /api/v1/agent/verify
 * Verify a skill claim using AI analysis
 */
router.post(
  '/verify',
  apiLimiter,
  [
    body('githubRepoUrl')
      .isURL()
      .withMessage('Valid GitHub repository URL is required')
      .matches(/github\.com/)
      .withMessage('Must be a GitHub URL'),
    body('skillName')
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Skill name must be between 2 and 100 characters'),
    body('claimId')
      .isInt({ min: 0 })
      .withMessage('Valid claim ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { githubRepoUrl, skillName, claimId } = req.body;

      logger.info('Received AI verification request', {
        claimId,
        skillName,
        githubRepoUrl,
      });

      // Perform AI verification
      const result = await verifierAgentService.verifySkillClaim({
        githubRepoUrl,
        skillName,
        claimId,
      });

      return res.json({
        success: true,
        data: {
          claimId: result.claimId,
          isValid: result.isValid,
          signature: result.signature,
          reasoning: result.reasoning,
          agentAddress: verifierAgentService.getAgentAddress(),
        },
      });
    } catch (error: any) {
      logger.error('AI verification endpoint error', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'AI verification failed',
      });
    }
  }
);

/**
 * GET /api/v1/agent/address
 * Get the AI agent's wallet address
 */
router.get('/address', async (_req: Request, res: Response) => {
  try {
    const address = verifierAgentService.getAgentAddress();
    return res.json({
      success: true,
      data: {
        agentAddress: address,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get agent address', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get agent address',
    });
  }
});

export default router;
