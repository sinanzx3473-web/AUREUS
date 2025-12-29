import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import redis from '../config/redis';

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'takumi-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'takumi-client';

/**
 * Generate a nonce for wallet signature
 */
export const getNonce = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;

    if (!address || !ethers.isAddress(address)) {
      res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
      });
      return;
    }

    // Generate random nonce
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    
    // Store nonce in Redis with 5 minute expiration
    await redis.setex(`nonce:${address.toLowerCase()}`, 300, nonce);

    logger.info(`Nonce generated for address: ${address}`);

    res.json({
      success: true,
      data: { nonce },
    });
  } catch (error) {
    logger.error('Error generating nonce', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate nonce',
    });
  }
};

/**
 * Verify wallet signature and issue JWT
 */
export const verifySignature = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address, signature } = req.body;

    if (!address || !signature) {
      res.status(400).json({
        success: false,
        error: 'Address and signature required',
      });
      return;
    }

    if (!ethers.isAddress(address)) {
      res.status(400).json({
        success: false,
        error: 'Invalid wallet address',
      });
      return;
    }

    // Get nonce from Redis
    const nonce = await redis.get(`nonce:${address.toLowerCase()}`);

    if (!nonce) {
      res.status(400).json({
        success: false,
        error: 'Nonce not found or expired. Please request a new nonce.',
      });
      return;
    }

    // Verify signature
    const message = `Sign this message to authenticate with Takumi:\n\nNonce: ${nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      res.status(401).json({
        success: false,
        error: 'Invalid signature',
      });
      return;
    }

    // Delete used nonce
    await redis.del(`nonce:${address.toLowerCase()}`);

    // Check if user is admin
    const adminResult = await query(
      'SELECT is_admin FROM users WHERE wallet_address = $1',
      [address.toLowerCase()]
    );

    const isAdmin = adminResult.rows.length > 0 && adminResult.rows[0].is_admin;

    // Generate JWT tokens with comprehensive claims
    const accessToken = jwt.sign(
      { address: address.toLowerCase(), isAdmin },
      JWT_SECRET,
      { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { address: address.toLowerCase() },
      JWT_REFRESH_SECRET,
      { 
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      } as jwt.SignOptions
    );

    // Store refresh token in Redis
    await redis.setex(
      `refresh:${address.toLowerCase()}`,
      30 * 24 * 60 * 60, // 30 days
      refreshToken
    );

    // Update or create user record
    await query(
      `INSERT INTO users (wallet_address, last_login_at)
       VALUES ($1, NOW())
       ON CONFLICT (wallet_address)
       DO UPDATE SET last_login_at = NOW()`,
      [address.toLowerCase()]
    );

    logger.info(`User authenticated: ${address}`);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        address: address.toLowerCase(),
        isAdmin,
      },
    });
  } catch (error) {
    logger.error('Error verifying signature', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Refresh token required',
      });
      return;
    }

    // Verify refresh token with comprehensive validation
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
      clockTolerance: 30,
    }) as {
      address: string;
      iat: number;
      exp: number;
    };

    // Check if refresh token exists in Redis
    const storedToken = await redis.get(`refresh:${decoded.address}`);

    if (storedToken !== token) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
      return;
    }

    // Check if user is admin
    const adminResult = await query(
      'SELECT is_admin FROM users WHERE wallet_address = $1',
      [decoded.address]
    );

    const isAdmin = adminResult.rows.length > 0 && adminResult.rows[0].is_admin;

    // Generate new access token with comprehensive claims
    const accessToken = jwt.sign(
      { address: decoded.address, isAdmin },
      JWT_SECRET,
      { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      } as jwt.SignOptions
    );

    res.json({
      success: true,
      data: {
        accessToken,
        address: decoded.address,
        isAdmin,
      },
    });
  } catch (error) {
    logger.error('Error refreshing token', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token',
    });
  }
};

/**
 * Logout user by invalidating refresh token
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.body;

    if (!address) {
      res.status(400).json({
        success: false,
        error: 'Address required',
      });
      return;
    }

    // Delete refresh token from Redis
    await redis.del(`refresh:${address.toLowerCase()}`);

    logger.info(`User logged out: ${address}`);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Error during logout', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
};
