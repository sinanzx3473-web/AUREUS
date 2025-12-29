import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/index';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import { metricsCollector } from './metricsCollector';
import { verifyApiKey, constantTimeCompare } from '../utils/crypto';
import redis from '../config/redis';

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
if (!process.env.ADMIN_API_KEY) {
  throw new Error('ADMIN_API_KEY environment variable is required for admin endpoints');
}

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const JWT_ISSUER = process.env.JWT_ISSUER || 'takumi-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'takumi-client';

/**
 * Middleware to verify JWT token with comprehensive validation
 */
export const authenticateJWT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      metricsCollector.recordAuthFailure('no_token', req.path);
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    // Comprehensive JWT validation with issuer, audience, and algorithm checks
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'], // Explicitly allow only HS256
      clockTolerance: 30, // 30 seconds clock skew tolerance
    }) as {
      address: string;
      isAdmin?: boolean;
      profileId?: string;
      iat: number;
      exp: number;
      iss: string;
      aud: string;
    };

    // Validate required claims exist
    if (!decoded.address) {
      metricsCollector.recordJwtValidationError('missing_claims');
      metricsCollector.recordAuthFailure('missing_claims', req.path);
      logger.warn('JWT missing required claims', { decoded });
      return res.status(403).json({
        success: false,
        error: 'Invalid token claims',
      });
    }

    // Validate token age (prevent future-dated tokens)
    const tokenAge = Date.now() / 1000 - decoded.iat;
    if (tokenAge < 0) {
      metricsCollector.recordJwtValidationError('future_dated');
      metricsCollector.recordAuthFailure('future_dated', req.path);
      logger.warn('Future-dated JWT detected', { iat: decoded.iat, now: Date.now() / 1000 });
      return res.status(403).json({
        success: false,
        error: 'Invalid token timestamp',
      });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      metricsCollector.recordJwtValidationError('expired');
      metricsCollector.recordAuthFailure('expired', req.path);
      logger.warn('JWT expired', { error: error.message });
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      metricsCollector.recordJwtValidationError('invalid');
      metricsCollector.recordAuthFailure('invalid', req.path);
      logger.warn('JWT validation failed', { error: error.message });
      return res.status(403).json({
        success: false,
        error: 'Invalid token',
      });
    }
    metricsCollector.recordJwtValidationError('unknown');
    metricsCollector.recordAuthFailure('unknown', req.path);
    logger.error('JWT authentication error', error);
    return res.status(403).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Middleware to verify admin API key with constant-time comparison
 */
export const authenticateAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      metricsCollector.recordAdminAuthFailure('no_api_key');
      return res.status(401).json({
        success: false,
        error: 'API key required',
      });
    }

    // Validate API key format (tak_live_* or tak_test_*)
    if (!apiKey.startsWith('tak_live_') && !apiKey.startsWith('tak_test_')) {
      // Check if it's the legacy master admin key (for backward compatibility)
      // This should be removed after all keys are migrated
      if (ADMIN_API_KEY && constantTimeCompare(apiKey, ADMIN_API_KEY)) {
        logger.warn('Legacy ADMIN_API_KEY used - please migrate to hashed API keys');
        req.user = { address: 'admin', isAdmin: true };
        return next();
      }

      metricsCollector.recordAdminAuthFailure('invalid_api_key_format');
      return res.status(403).json({
        success: false,
        error: 'Invalid API key format',
      });
    }

    // Try to get cached API key hashes from Redis for performance
    const cacheKey = 'api_keys:active_hashes';
    let validKeyHashes: Array<{ id: string; key_hash: string; created_by: string; permissions: string[]; }> = [];
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        validKeyHashes = JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Redis cache read failed, falling back to database', error);
    }

    // If cache miss, fetch from database and cache
    if (validKeyHashes.length === 0) {
      const result = await query(
        'SELECT id, key_hash, created_by, permissions, last_used_at FROM api_keys WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())'
      );

      if (result.rows.length === 0) {
        metricsCollector.recordAdminAuthFailure('no_active_keys');
        return res.status(403).json({
          success: false,
          error: 'Invalid or expired API key',
        });
      }

      validKeyHashes = result.rows;
      
      // Cache for 5 minutes
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(validKeyHashes));
      } catch (error) {
        logger.warn('Redis cache write failed', error);
      }
    }

    // Verify API key against all hashes using bcrypt (timing-safe)
    let matchedKey = null;
    for (const row of validKeyHashes) {
      const isValid = await verifyApiKey(apiKey, row.key_hash);
      if (isValid) {
        matchedKey = row;
        break;
      }
    }

    if (!matchedKey) {
      metricsCollector.recordAdminAuthFailure('invalid_api_key');
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired API key',
      });
    }

    // Update last_used_at timestamp (fire and forget)
    query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [matchedKey.id]
    ).catch(err => logger.error('Failed to update API key last_used_at', err));

    req.user = {
      address: matchedKey.created_by || 'admin',
      isAdmin: true,
      apiKeyId: matchedKey.id,
      permissions: matchedKey.permissions || [],
    };

    next();
  } catch (error) {
    metricsCollector.recordAdminAuthFailure('authentication_error');
    logger.error('Admin authentication error', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
      clockTolerance: 30,
    }) as {
      address: string;
      isAdmin: boolean;
      iat: number;
      exp: number;
      iss: string;
      aud: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};
