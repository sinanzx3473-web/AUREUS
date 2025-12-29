import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

/**
 * JWT Rotation Middleware
 * 
 * Supports zero-downtime JWT secret rotation by verifying tokens against
 * both current and previous secrets during the grace period.
 * 
 * Environment Variables:
 * - JWT_SECRET: Current JWT signing secret (required)
 * - JWT_SECRET_PREVIOUS: Previous JWT secret (optional, used during rotation)
 * - JWT_REFRESH_SECRET: Current refresh token secret (required)
 * - JWT_REFRESH_SECRET_PREVIOUS: Previous refresh secret (optional)
 */

interface JwtPayload {
  userId?: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Verify JWT token with rotation support
 * 
 * Attempts to verify token with current secret first, then falls back to
 * previous secret if available. This allows old tokens to remain valid
 * during the 48-hour grace period after rotation.
 */
export function verifyTokenWithRotation(
  token: string,
  isRefreshToken: boolean = false
): JwtPayload {
  const currentSecret = isRefreshToken 
    ? process.env.JWT_REFRESH_SECRET 
    : process.env.JWT_SECRET;
  
  const previousSecret = isRefreshToken
    ? process.env.JWT_REFRESH_SECRET_PREVIOUS
    : process.env.JWT_SECRET_PREVIOUS;

  if (!currentSecret) {
    throw new Error('JWT secret not configured');
  }

  // Try current secret first
  try {
    const decoded = jwt.verify(token, currentSecret, {
      issuer: process.env.JWT_ISSUER || 'takumi-api',
      audience: process.env.JWT_AUDIENCE || 'takumi-client',
    }) as JwtPayload;

    logger.debug('Token verified with current secret');
    return decoded;
  } catch (currentError) {
    // If current secret fails and previous secret exists, try previous
    if (previousSecret) {
      try {
        const decoded = jwt.verify(token, previousSecret, {
          issuer: process.env.JWT_ISSUER || 'takumi-api',
          audience: process.env.JWT_AUDIENCE || 'takumi-client',
        }) as JwtPayload;

        logger.info('Token verified with previous secret (grace period active)');
        
        // Track usage of old secrets for monitoring
        if (process.env.NODE_ENV === 'production') {
          logger.warn('Token using previous secret - consider refreshing', {
            userId: decoded.userId,
            tokenAge: decoded.iat ? Date.now() / 1000 - decoded.iat : 'unknown',
          });
        }

        return decoded;
      } catch (previousError) {
        // Both secrets failed
        logger.error('Token verification failed with both current and previous secrets', {
          currentError: (currentError as Error).message,
          previousError: (previousError as Error).message,
        });
        throw currentError; // Throw original error
      }
    }

    // No previous secret available, throw original error
    throw currentError;
  }
}

/**
 * Express middleware for JWT verification with rotation support
 * 
 * This middleware is applied globally but only verifies tokens when
 * Authorization header is present. Individual routes can still use
 * their own authentication middleware for stricter control.
 */
export function verifyJwtWithRotation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip if no Authorization header (let route-specific auth handle it)
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  try {
    // Verify token with rotation support
    const decoded = verifyTokenWithRotation(token, false);
    
    // Attach decoded payload to request for downstream middleware
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    // Don't fail here - let route-specific auth middleware handle errors
    // This allows public routes to work even with invalid tokens
    logger.debug('JWT verification failed in global middleware', {
      error: (error as Error).message,
    });
    next();
  }
}

/**
 * Generate new JWT token with current secret
 * 
 * Always uses current secret for signing new tokens, even during grace period.
 */
export function generateToken(
  payload: JwtPayload,
  isRefreshToken: boolean = false
): string {
  const secret = isRefreshToken
    ? process.env.JWT_REFRESH_SECRET
    : process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT secret not configured');
  }

  const expiresIn = isRefreshToken
    ? process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    : process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: process.env.JWT_ISSUER || 'takumi-api',
    audience: process.env.JWT_AUDIENCE || 'takumi-client',
  });
}

/**
 * Check if grace period is active
 * 
 * Returns true if JWT_SECRET_PREVIOUS is set, indicating rotation is in progress.
 */
export function isGracePeriodActive(): boolean {
  return !!(process.env.JWT_SECRET_PREVIOUS || process.env.JWT_REFRESH_SECRET_PREVIOUS);
}

/**
 * Get rotation status for monitoring/debugging
 */
export function getRotationStatus(): {
  gracePeriodActive: boolean;
  hasCurrentSecret: boolean;
  hasPreviousSecret: boolean;
  hasCurrentRefreshSecret: boolean;
  hasPreviousRefreshSecret: boolean;
} {
  return {
    gracePeriodActive: isGracePeriodActive(),
    hasCurrentSecret: !!process.env.JWT_SECRET,
    hasPreviousSecret: !!process.env.JWT_SECRET_PREVIOUS,
    hasCurrentRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
    hasPreviousRefreshSecret: !!process.env.JWT_REFRESH_SECRET_PREVIOUS,
  };
}
