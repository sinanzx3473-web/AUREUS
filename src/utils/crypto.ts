import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { logger } from './logger';

const BCRYPT_ROUNDS = 12;

/**
 * Generate a cryptographically secure random API key
 * Format: tak_live_<32 bytes hex> or tak_test_<32 bytes hex>
 */
export const generateApiKey = (prefix: 'live' | 'test' = 'live'): string => {
  const randomBytes = crypto.randomBytes(32);
  const key = `tak_${prefix}_${randomBytes.toString('hex')}`;
  return key;
};

/**
 * Hash an API key using bcrypt
 * @param apiKey - The plaintext API key to hash
 * @returns Promise<string> - The bcrypt hash
 */
export const hashApiKey = async (apiKey: string): Promise<string> => {
  try {
    const hash = await bcrypt.hash(apiKey, BCRYPT_ROUNDS);
    return hash;
  } catch (error) {
    logger.error('Error hashing API key', error);
    throw new Error('Failed to hash API key');
  }
};

/**
 * Verify an API key against a bcrypt hash using constant-time comparison
 * @param apiKey - The plaintext API key to verify
 * @param hash - The bcrypt hash to compare against
 * @returns Promise<boolean> - True if the key matches the hash
 */
export const verifyApiKey = async (apiKey: string, hash: string): Promise<boolean> => {
  try {
    const isValid = await bcrypt.compare(apiKey, hash);
    return isValid;
  } catch (error) {
    logger.error('Error verifying API key', error);
    return false;
  }
};

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns boolean - True if strings are equal
 */
export const constantTimeCompare = (a: string, b: string): boolean => {
  try {
    // Use crypto.timingSafeEqual for constant-time comparison
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    
    // If lengths differ, still compare to prevent timing leaks
    if (bufA.length !== bufB.length) {
      // Compare against a dummy buffer of the same length as bufA
      const dummyBuf = Buffer.alloc(bufA.length);
      crypto.timingSafeEqual(bufA, dummyBuf);
      return false;
    }
    
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (error) {
    logger.error('Error in constant-time comparison', error);
    return false;
  }
};

/**
 * Generate a secure random token for CSRF, nonces, etc.
 * @param bytes - Number of random bytes (default: 32)
 * @returns string - Hex-encoded random token
 */
export const generateSecureToken = (bytes: number = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a password using bcrypt (for future admin user accounts)
 * @param password - The plaintext password
 * @returns Promise<string> - The bcrypt hash
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return hash;
  } catch (error) {
    logger.error('Error hashing password', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Verify a password against a bcrypt hash
 * @param password - The plaintext password
 * @param hash - The bcrypt hash
 * @returns Promise<boolean> - True if password matches
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    logger.error('Error verifying password', error);
    return false;
  }
};
