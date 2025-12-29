import { Response } from 'express';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import { generateApiKey, hashApiKey } from '../utils/crypto';

/**
 * Generate a new API key
 * Only accessible by admin users
 */
export const createApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, permissions, expiresInDays } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'API key name is required',
      });
      return;
    }

    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
      return;
    }

    // Generate a new API key
    const apiKey = generateApiKey('live');
    
    // Hash the API key before storing
    const keyHash = await hashApiKey(apiKey);

    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresInDays && typeof expiresInDays === 'number' && expiresInDays > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expiresInDays);
      expiresAt = expirationDate;
    }

    // Store the hashed key in database
    const result = await query(
      `INSERT INTO api_keys (key_hash, name, description, permissions, created_by, expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, name, description, permissions, created_at, expires_at`,
      [
        keyHash,
        name.trim(),
        description || null,
        JSON.stringify(permissions || []),
        req.user.address,
        expiresAt,
      ]
    );

    const apiKeyData = result.rows[0];

    logger.info(`API key created: ${name} by ${req.user.address}`);

    // Return the plaintext API key ONLY ONCE
    res.status(201).json({
      success: true,
      data: {
        apiKey, // This is the ONLY time the plaintext key is shown
        id: apiKeyData.id,
        name: apiKeyData.name,
        description: apiKeyData.description,
        permissions: apiKeyData.permissions,
        createdAt: apiKeyData.created_at,
        expiresAt: apiKeyData.expires_at,
      },
      warning: 'Store this API key securely. It will not be shown again.',
    });
  } catch (error) {
    logger.error('Error creating API key', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API key',
    });
  }
};

/**
 * List all API keys (without revealing the actual keys)
 * Only accessible by admin users
 */
export const listApiKeys = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
      return;
    }

    const result = await query(
      `SELECT id, name, description, permissions, created_by, created_at, last_used_at, expires_at, is_active
       FROM api_keys
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        permissions: row.permissions,
        createdBy: row.created_by,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
        expiresAt: row.expires_at,
        isActive: row.is_active,
      })),
    });
  } catch (error) {
    logger.error('Error listing API keys', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys',
    });
  }
};

/**
 * Revoke an API key
 * Only accessible by admin users
 */
export const revokeApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
      return;
    }

    const result = await query(
      'UPDATE api_keys SET is_active = false WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'API key not found',
      });
      return;
    }

    logger.info(`API key revoked: ${result.rows[0].name} by ${req.user.address}`);

    res.json({
      success: true,
      message: 'API key revoked successfully',
      data: {
        id: result.rows[0].id,
        name: result.rows[0].name,
      },
    });
  } catch (error) {
    logger.error('Error revoking API key', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key',
    });
  }
};

/**
 * Delete an API key permanently
 * Only accessible by admin users
 */
export const deleteApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
      return;
    }

    const result = await query(
      'DELETE FROM api_keys WHERE id = $1 RETURNING id, name',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'API key not found',
      });
      return;
    }

    logger.info(`API key deleted: ${result.rows[0].name} by ${req.user.address}`);

    res.json({
      success: true,
      message: 'API key deleted successfully',
      data: {
        id: result.rows[0].id,
        name: result.rows[0].name,
      },
    });
  } catch (error) {
    logger.error('Error deleting API key', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete API key',
    });
  }
};

/**
 * Rotate an API key (generate new key, revoke old one)
 * Only accessible by admin users
 */
export const rotateApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.user?.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
      return;
    }

    // Get existing API key details
    const existingKey = await query(
      'SELECT name, description, permissions, expires_at FROM api_keys WHERE id = $1 AND is_active = true',
      [id]
    );

    if (existingKey.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'API key not found or already inactive',
      });
      return;
    }

    const oldKeyData = existingKey.rows[0];

    // Generate new API key
    const newApiKey = generateApiKey('live');
    const newKeyHash = await hashApiKey(newApiKey);

    // Start transaction
    await query('BEGIN');

    try {
      // Deactivate old key
      await query(
        'UPDATE api_keys SET is_active = false WHERE id = $1',
        [id]
      );

      // Create new key with same properties
      const result = await query(
        `INSERT INTO api_keys (key_hash, name, description, permissions, created_by, expires_at, is_active, last_rotated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
         RETURNING id, name, description, permissions, created_at, expires_at`,
        [
          newKeyHash,
          oldKeyData.name,
          oldKeyData.description,
          oldKeyData.permissions,
          req.user.address,
          oldKeyData.expires_at,
        ]
      );

      await query('COMMIT');

      const newKeyData = result.rows[0];

      logger.info(`API key rotated: ${oldKeyData.name} by ${req.user.address}`);

      res.json({
        success: true,
        data: {
          apiKey: newApiKey, // This is the ONLY time the plaintext key is shown
          id: newKeyData.id,
          name: newKeyData.name,
          description: newKeyData.description,
          permissions: newKeyData.permissions,
          createdAt: newKeyData.created_at,
          expiresAt: newKeyData.expires_at,
        },
        warning: 'Store this API key securely. It will not be shown again.',
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Error rotating API key', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rotate API key',
    });
  }
};
