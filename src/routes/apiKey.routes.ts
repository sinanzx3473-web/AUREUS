import { Router } from 'express';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  rotateApiKey,
} from '../controllers/apiKey.controller';
import { authenticateAdmin } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/keys
 * @desc    Create a new API key
 * @access  Admin only
 */
router.post(
  '/',
  authenticateAdmin,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('API key name is required')
      .isLength({ max: 255 })
      .withMessage('Name must be less than 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
    body('expiresInDays')
      .optional()
      .isInt({ min: 1, max: 3650 })
      .withMessage('Expiration must be between 1 and 3650 days'),
  ],
  validate,
  createApiKey
);

/**
 * @route   GET /api/keys
 * @desc    List all API keys
 * @access  Admin only
 */
router.get('/', authenticateAdmin, listApiKeys);

/**
 * @route   POST /api/keys/:id/revoke
 * @desc    Revoke an API key
 * @access  Admin only
 */
router.post(
  '/:id/revoke',
  authenticateAdmin,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid API key ID'),
  ],
  validate,
  revokeApiKey
);

/**
 * @route   DELETE /api/keys/:id
 * @desc    Delete an API key permanently
 * @access  Admin only
 */
router.delete(
  '/:id',
  authenticateAdmin,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid API key ID'),
  ],
  validate,
  deleteApiKey
);

/**
 * @route   POST /api/keys/:id/rotate
 * @desc    Rotate an API key (generate new, revoke old)
 * @access  Admin only
 */
router.post(
  '/:id/rotate',
  authenticateAdmin,
  [
    param('id')
      .isUUID()
      .withMessage('Invalid API key ID'),
  ],
  validate,
  rotateApiKey
);

export default router;
