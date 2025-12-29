import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { logger } from '../utils/logger';

/**
 * Middleware to handle validation errors
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map((err: any) => ({
      field: err.param,
      message: err.msg,
    }));

    logger.warn('Validation failed', {
      path: req.path,
      errors: extractedErrors,
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: extractedErrors,
    });
  };
};

/**
 * Sanitize pagination parameters
 */
export const sanitizePagination = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit as string) || 10)
  );
  const offset = (page - 1) * limit;

  req.query.page = page.toString();
  req.query.limit = limit.toString();
  req.query.offset = offset.toString();

  next();
};

/**
 * Validate Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate transaction hash
 */
export const isValidTxHash = (hash: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};
