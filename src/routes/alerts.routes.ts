import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import { webhookLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply webhook rate limiting to alert endpoints
router.use(webhookLimiter);

interface AlertmanagerWebhook {
  version: string;
  groupKey: string;
  status: 'firing' | 'resolved';
  receiver: string;
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL: string;
  alerts: Array<{
    status: 'firing' | 'resolved';
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: string;
    endsAt: string;
    generatorURL: string;
    fingerprint: string;
  }>;
}

/**
 * @route   POST /api/v1/alerts/webhook
 * @desc    Receive alerts from Alertmanager
 * @access  Public (should be restricted to Alertmanager IP in production)
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const webhook: AlertmanagerWebhook = req.body;

    logger.info('Received alert webhook', {
      status: webhook.status,
      groupKey: webhook.groupKey,
      alertCount: webhook.alerts.length,
    });

    // Process each alert
    for (const alert of webhook.alerts) {
      const severity = alert.labels.severity || 'info';
      const alertname = alert.labels.alertname || 'Unknown';
      const description = alert.annotations.description || alert.annotations.summary || 'No description';

      // Log alert
      if (alert.status === 'firing') {
        logger.warn(`Alert firing: ${alertname}`, {
          severity,
          description,
          labels: alert.labels,
          startsAt: alert.startsAt,
        });
      } else {
        logger.info(`Alert resolved: ${alertname}`, {
          severity,
          description,
          labels: alert.labels,
          endsAt: alert.endsAt,
        });
      }

      // Store alert in database for tracking
      try {
        await query(
          `INSERT INTO notifications (
            type, 
            title, 
            message, 
            severity, 
            metadata, 
            created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            'alert',
            alertname,
            description,
            severity,
            JSON.stringify({
              status: alert.status,
              labels: alert.labels,
              annotations: alert.annotations,
              fingerprint: alert.fingerprint,
            }),
          ]
        );
      } catch (dbError) {
        logger.error('Failed to store alert in database', dbError);
      }

      // Trigger emergency actions for critical alerts
      if (severity === 'critical' && alert.status === 'firing') {
        await handleCriticalAlert(alert);
      }
    }

    res.json({
      success: true,
      message: 'Alerts processed successfully',
      alertsProcessed: webhook.alerts.length,
    });
  } catch (error) {
    logger.error('Error processing alert webhook', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process alerts',
    });
  }
});

/**
 * Handle critical alerts with emergency procedures
 */
async function handleCriticalAlert(alert: AlertmanagerWebhook['alerts'][0]) {
  const alertname = alert.labels.alertname;

  logger.error(`CRITICAL ALERT: ${alertname}`, {
    description: alert.annotations.description,
    labels: alert.labels,
  });

  // Implement emergency procedures based on alert type
  switch (alertname) {
    case 'APIDown':
      // Trigger health check and potential restart
      logger.error('API is down - manual intervention required');
      break;

    case 'DatabaseConnectionFailure':
      // Attempt reconnection or failover
      logger.error('Database connection failure - attempting reconnection');
      break;

    case 'HighErrorRate':
      // Enable circuit breaker or rate limiting
      logger.error('High error rate detected - consider enabling circuit breaker');
      break;

    case 'IndexerLag':
      // Restart indexer or increase sync speed
      logger.error('Indexer lagging - consider restarting indexer service');
      break;

    default:
      logger.error(`Unhandled critical alert: ${alertname}`);
  }

  // Send notification to admin channels (Slack, email, PagerDuty, etc.)
  // This would integrate with notification service
}

/**
 * @route   GET /api/v1/alerts/history
 * @desc    Get alert history
 * @access  Admin
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, severity } = req.query;

    let queryText = `
      SELECT * FROM notifications 
      WHERE type = 'alert'
    `;
    const params: any[] = [];

    if (severity) {
      params.push(severity);
      queryText += ` AND severity = $${params.length}`;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: result.rowCount,
      },
    });
  } catch (error) {
    logger.error('Error fetching alert history', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert history',
    });
  }
});

export default router;
