import { Router, Request, Response } from 'express';
import { AuthRequest } from '../types/index';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { metricsCollector } from '../middleware/metricsCollector';
import { authenticateJWT } from '../middleware/auth';
import { logger } from '../utils/logger';
import { strictLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply strict rate limiting to metrics endpoints (sensitive data)
router.use(strictLimiter);

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ prefix: 'takumi_' });

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'takumi_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new Counter({
  name: 'takumi_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const indexerBlockHeight = new Gauge({
  name: 'takumi_indexer_block_height',
  help: 'Current block height being indexed',
  labelNames: ['chain'],
});

export const indexerBlockLag = new Gauge({
  name: 'takumi_indexer_block_lag',
  help: 'Number of blocks behind chain head',
  labelNames: ['chain'],
});

export const indexerEventsTotal = new Counter({
  name: 'takumi_indexer_events_total',
  help: 'Total number of blockchain events indexed',
  labelNames: ['contract', 'event_type'],
});

export const indexerErrorsTotal = new Counter({
  name: 'takumi_indexer_errors_total',
  help: 'Total number of indexer errors',
  labelNames: ['type'],
});

export const dbQueryDuration = new Histogram({
  name: 'takumi_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

export const dbConnectionsActive = new Gauge({
  name: 'takumi_db_connections_active',
  help: 'Number of active database connections',
});

export const redisOperationDuration = new Histogram({
  name: 'takumi_redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
});

export const activeWebsockets = new Gauge({
  name: 'takumi_active_websockets',
  help: 'Number of active WebSocket connections',
});

export const profilesTotal = new Gauge({
  name: 'takumi_profiles_total',
  help: 'Total number of profiles in database',
});

export const skillsTotal = new Gauge({
  name: 'takumi_skills_total',
  help: 'Total number of skills in database',
});

export const endorsementsTotal = new Gauge({
  name: 'takumi_endorsements_total',
  help: 'Total number of endorsements in database',
});

/**
 * @route   GET /metrics
 * @desc    Prometheus metrics endpoint
 * @access  Public (should be restricted in production)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

/**
 * @route   GET /metrics/indexer
 * @desc    Indexer-specific metrics endpoint
 * @access  Public (should be restricted in production)
 */
router.get('/indexer', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.getSingleMetricAsString('takumi_indexer_block_height');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting indexer metrics');
  }
});

/**
 * @route   GET /metrics/api
 * @desc    API performance metrics
 * @access  Authenticated
 */
router.get('/api', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const summary = metricsCollector.getAPIMetricsSummary(minutes);

    res.json({
      success: true,
      timeWindow: `${minutes} minutes`,
      metrics: summary,
    });
  } catch (error) {
    logger.error('Error fetching API metrics', error);
    res.status(500).json({ error: 'Failed to fetch API metrics' });
  }
});

/**
 * @route   GET /metrics/gas
 * @desc    Gas usage metrics
 * @access  Authenticated
 */
router.get('/gas', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const summary = metricsCollector.getGasMetricsSummary(hours);

    res.json({
      success: true,
      timeWindow: `${hours} hours`,
      metrics: summary,
    });
  } catch (error) {
    logger.error('Error fetching gas metrics', error);
    res.status(500).json({ error: 'Failed to fetch gas metrics' });
  }
});

/**
 * @route   GET /metrics/errors
 * @desc    Error metrics
 * @access  Authenticated
 */
router.get('/errors', authenticateJWT, async (_req: AuthRequest, res: Response) => {
  try {
    const errors = metricsCollector.getErrorMetrics();

    res.json({
      success: true,
      errors,
    });
  } catch (error) {
    logger.error('Error fetching error metrics', error);
    res.status(500).json({ error: 'Failed to fetch error metrics' });
  }
});

export default router;
