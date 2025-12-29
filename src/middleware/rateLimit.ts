import rateLimit from 'express-rate-limit';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { metricsCollector } from './metricsCollector';

/**
 * Redis-based rate limiter store
 */
class RedisStore {
  prefix: string;
  resetExpiryOnChange: boolean;

  constructor(prefix = 'rl:', resetExpiryOnChange = false) {
    this.prefix = prefix;
    this.resetExpiryOnChange = resetExpiryOnChange;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const redisKey = this.prefix + key;
    const current = await redis.incr(redisKey);

    if (current === 1) {
      const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
      await redis.pexpire(redisKey, windowMs);
    }

    const ttl = await redis.pttl(redisKey);
    const resetTime = ttl > 0 ? new Date(Date.now() + ttl) : undefined;

    // Track current rate limit usage
    const limiterType = this.prefix.replace('rl:', '').replace(':', '');
    metricsCollector.recordRateLimitExceeded(key, limiterType);

    return {
      totalHits: current,
      resetTime,
    };
  }

  async decrement(key: string): Promise<void> {
    const redisKey = this.prefix + key;
    await redis.decr(redisKey);
  }

  async resetKey(key: string): Promise<void> {
    const redisKey = this.prefix + key;
    await redis.del(redisKey);
  }
}

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  store: new RedisStore('rl:api:') as any,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
    });
  },
});

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  store: new RedisStore('rl:strict:') as any,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth endpoint rate limiter
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  store: new RedisStore('rl:auth:') as any,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Search endpoint rate limiter (more restrictive for expensive queries)
 */
export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  store: new RedisStore('rl:search:') as any,
  message: {
    success: false,
    error: 'Too many search requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Upload endpoint rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  store: new RedisStore('rl:upload:') as any,
  message: {
    success: false,
    error: 'Too many upload requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Webhook endpoint rate limiter
 */
export const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  store: new RedisStore('rl:webhook:') as any,
  message: {
    success: false,
    error: 'Too many webhook requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default apiLimiter;
