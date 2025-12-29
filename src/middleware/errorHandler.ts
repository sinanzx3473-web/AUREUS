import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom error class with status code support
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * Sanitizes errors in production, provides detailed errors in development
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Default error values
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status >= 500 ? 'ERR_INTERNAL' : 'ERR_BAD_REQUEST');

  // Log the full error internally with context
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    status,
    code,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Determine the message to send to client
  let message: string;
  
  if (isProduction) {
    // Production: sanitized corporate messages
    if (status >= 500) {
      message = 'An internal protocol error occurred.';
    } else if (status === 401) {
      message = 'Authentication required.';
    } else if (status === 403) {
      message = 'Access denied.';
    } else if (status === 404) {
      message = 'Resource not found.';
    } else if (status === 429) {
      message = 'Rate limit exceeded.';
    } else {
      message = err.message || 'Request could not be processed.';
    }
  } else {
    // Development: detailed error messages
    message = err.message || 'An error occurred';
  }

  // Send sanitized response
  res.status(status).json({
    success: false,
    message,
    code: isProduction ? code : err.code || code,
    ...(isProduction ? {} : {
      // Include additional debug info in development
      stack: err.stack,
      details: err.details,
    }),
  });
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'ERR_NOT_FOUND'
  );
  next(error);
};

/**
 * Async handler wrapper to catch promise rejections
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
