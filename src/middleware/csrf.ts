import Tokens = require('csrf');
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Initialize CSRF token generator
const tokens = new Tokens();

// Extend Express Request type to include CSRF secret
declare global {
  namespace Express {
    interface Request {
      csrfSecret?: string;
    }
  }
}

// CSRF protection middleware using csrf package
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get secret from cookie
  const secret = req.cookies?._csrf;
  
  if (!secret) {
    logger.warn('CSRF secret missing from cookie', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      message: 'CSRF secret not found. Please refresh and try again.',
    });
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  
  if (!token) {
    logger.warn('CSRF token missing from request', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      message: 'CSRF token not provided. Please refresh and try again.',
    });
  }

  // Verify token
  if (!tokens.verify(secret, token as string)) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      message: 'Request rejected due to invalid CSRF token. Please refresh and try again.',
    });
  }

  next();
};

// Middleware to attach CSRF token to response
export const attachCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Generate or retrieve secret from cookie
  let secret = req.cookies?._csrf;
  
  if (!secret) {
    secret = tokens.secretSync();
    res.cookie('_csrf', secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });
  }

  // Attach csrfToken method to request
  const csrfToken = tokens.create(secret);
  (req as any).csrfToken = () => csrfToken;
  (req as any).csrfSecret = secret;
  res.locals.csrfToken = csrfToken;
  
  next();
};

// Endpoint to get CSRF token
export const getCsrfToken = (req: Request, res: Response) => {
  const token = (req as any).csrfToken ? (req as any).csrfToken() : '';
  res.json({
    success: true,
    csrfToken: token,
  });
};

// Error handler for CSRF validation failures
export const csrfErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
      message: 'Request rejected due to invalid CSRF token. Please refresh and try again.',
    });
    return;
  }

  next(err);
};
