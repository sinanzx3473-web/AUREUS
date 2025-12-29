import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { csrfProtection, attachCsrfToken, getCsrfToken, csrfErrorHandler } from './middleware/csrf';
import { apiLimiter } from './middleware/rateLimit';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { metricsCollector } from './middleware/metricsCollector';
import pool from './config/database';
import redis from './config/redis';
import indexerService from './services/indexer.service';
import { verifyJwtWithRotation } from './middleware/jwtRotation';
import tracingSDK from './config/tracing';
import { contractTracingMiddleware } from './middleware/tracing';

// Import routes
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import skillRoutes from './routes/skill.routes';
import storageRoutes from './routes/storage.routes';
import metricsRoutes from './routes/metrics.routes';
import alertsRoutes from './routes/alerts.routes';
import webhookRoutes from './routes/webhook.routes';
import notificationRoutes from './routes/notification.routes';
import apiKeyRoutes from './routes/apiKey.routes';
import rotationStatusRoutes from './routes/rotation-status.routes';
import agentRoutes from './routes/agent.routes';
import careerOracleRoutes from './routes/careerOracle.routes';
import walletPassRoutes from './routes/walletPass.routes';

// Load environment variables
dotenv.config();

// Initialize OpenTelemetry tracing
if (process.env.ENABLE_TRACING !== 'false') {
  tracingSDK.start();
  logger.info('OpenTelemetry tracing initialized');
}

const app: Application = express();
const PORT = process.env.PORT || 3001;
const API_VERSION = process.env.API_VERSION || 'v1';

// CORS Configuration with Explicit Whitelist
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || [];

// CRITICAL: Reject wildcard CORS in production
if (process.env.NODE_ENV === 'production' && (corsOrigins.length === 0 || corsOrigins.includes('*'))) {
  logger.error('SECURITY VIOLATION: CORS wildcard (*) or empty origins detected in production');
  logger.error('Set CORS_ORIGINS environment variable with explicit comma-separated origins');
  process.exit(1);
}

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Development: Allow all origins if CORS_ORIGINS not set
    if (process.env.NODE_ENV === 'development' && corsOrigins.length === 0) {
      logger.warn(`CORS: Allowing origin ${origin} (development mode with no CORS_ORIGINS set)`);
      return callback(null, true);
    }

    // Check if origin is in whitelist
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject origin not in whitelist
    logger.warn(`CORS: Rejected origin ${origin} (not in whitelist: ${corsOrigins.join(', ')})`);
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser (required for CSRF)
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// JWT rotation support middleware
app.use(verifyJwtWithRotation);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

// Metrics middleware
app.use(metricsMiddleware);
app.use(metricsCollector.collectAPIMetrics());

// Distributed tracing middleware for contract operations
if (process.env.ENABLE_TRACING !== 'false') {
  app.use(contractTracingMiddleware);
}

// Rate limiting
app.use(`/api/${API_VERSION}`, apiLimiter);

// CSRF protection for state-changing operations
app.use(`/api/${API_VERSION}`, csrfProtection, attachCsrfToken);

// CSRF token endpoint
app.get(`/api/${API_VERSION}/csrf-token`, getCsrfToken);

// Health check
app.get('/health', async (_req, res) => {
  try {
    // Check database
    await pool.query('SELECT 1');
    
    // Check Redis
    await redis.ping();

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Service unavailable',
    });
  }
});

// Metrics endpoint (no rate limiting)
app.use('/metrics', metricsRoutes);

// API Routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/profiles`, profileRoutes);
app.use(`/api/${API_VERSION}/skills`, skillRoutes);
app.use(`/api/${API_VERSION}/storage`, storageRoutes);
app.use(`/api/${API_VERSION}/alerts`, alertsRoutes);
app.use(`/api/${API_VERSION}/webhooks`, webhookRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/keys`, apiKeyRoutes);
app.use(`/api/${API_VERSION}/rotation`, rotationStatusRoutes);
app.use(`/api/${API_VERSION}/agent`, agentRoutes);
app.use(`/api/${API_VERSION}/career-oracle`, careerOracleRoutes);
app.use(`/api/${API_VERSION}/wallet-pass`, walletPassRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Takumi Backend API',
    version: API_VERSION,
    documentation: '/api/docs',
  });
});

// Error handlers (must be last)
app.use(csrfErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server gracefully...');

  try {
    // Stop indexer
    indexerService.stop();

    // Close database pool
    await pool.end();
    logger.info('Database pool closed');

    // Close Redis connection
    await redis.quit();
    logger.info('Redis connection closed');

    // Shutdown tracing
    if (process.env.ENABLE_TRACING !== 'false') {
      await tracingSDK.shutdown();
      logger.info('Tracing SDK shutdown complete');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    logger.info('Database connected successfully');

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connected successfully');

    // Initialize and start indexer
    if (process.env.NODE_ENV !== 'test') {
      await indexerService.initialize();
      await indexerService.start();
      logger.info('Blockchain indexer started');
    }

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`API available at http://localhost:${PORT}/api/${API_VERSION}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
