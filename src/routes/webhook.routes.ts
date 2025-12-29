import { Router } from 'express';
import { webhookService } from '../services/webhook.service';
import { authenticateJWT } from '../middleware/auth';
import { logger } from '../utils/logger';
import { webhookLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply webhook-specific rate limiting
router.use(webhookLimiter);

/**
 * Register a new webhook subscription
 */
router.post('/register', authenticateJWT, async (req, res) => {
  try {
    const { url, events, secret } = req.body;

    if (!url || !events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'Missing required fields: url and events array',
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const webhookId = await webhookService.registerWebhook(
      url,
      events,
      secret,
      (req as any).user?.apiKeyId
    );

    return res.status(201).json({
      success: true,
      webhookId,
      message: 'Webhook registered successfully',
    });
  } catch (error) {
    logger.error('Error registering webhook', error);
    return res.status(500).json({ error: 'Failed to register webhook' });
  }
});

/**
 * Unregister a webhook subscription
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    await webhookService.unregisterWebhook(parseInt(id));

    res.json({
      success: true,
      message: 'Webhook unregistered successfully',
    });
  } catch (error) {
    logger.error('Error unregistering webhook', error);
    res.status(500).json({ error: 'Failed to unregister webhook' });
  }
});

/**
 * Get webhook delivery logs
 */
router.get('/:id/logs', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const logs = await webhookService.getWebhookLogs(parseInt(id), limit);

    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    logger.error('Error fetching webhook logs', error);
    res.status(500).json({ error: 'Failed to fetch webhook logs' });
  }
});

/**
 * List available webhook events
 */
router.get('/events', (_req, res) => {
  const events = [
    'profile.created',
    'skill.added',
    'skill.verified',
    'endorsement.created',
    'verifier.registered',
    'claim.created',
    'claim.approved',
    'claim.rejected',
  ];

  res.json({
    success: true,
    events,
  });
});

export default router;
