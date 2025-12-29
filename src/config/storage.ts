import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Storage configuration with least-privilege principles
 */

// Base storage directory (should be outside web root)
const STORAGE_BASE_DIR = process.env.STORAGE_BASE_DIR || path.join(process.cwd(), 'storage');

// Storage subdirectories with specific purposes
export const STORAGE_PATHS = {
  uploads: path.join(STORAGE_BASE_DIR, 'uploads'),
  temp: path.join(STORAGE_BASE_DIR, 'temp'),
  cache: path.join(STORAGE_BASE_DIR, 'cache'),
  logs: path.join(STORAGE_BASE_DIR, 'logs'),
  backups: path.join(STORAGE_BASE_DIR, 'backups'),
} as const;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  metadata: 1 * 1024 * 1024, // 1MB
  default: 5 * 1024 * 1024, // 5MB
} as const;

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'text/plain', 'application/json'],
  metadata: ['application/json'],
} as const;

// File extensions whitelist
export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
  '.json',
] as const;

/**
 * Initialize storage directories with proper permissions
 */
export const initializeStorage = (): void => {
  try {
    // Create base directory
    if (!fs.existsSync(STORAGE_BASE_DIR)) {
      fs.mkdirSync(STORAGE_BASE_DIR, { recursive: true, mode: 0o750 });
      logger.info(`Created storage base directory: ${STORAGE_BASE_DIR}`);
    }

    // Create subdirectories with restricted permissions
    Object.entries(STORAGE_PATHS).forEach(([name, dirPath]) => {
      if (!fs.existsSync(dirPath)) {
        // 0o750 = rwxr-x--- (owner: rwx, group: r-x, others: none)
        fs.mkdirSync(dirPath, { recursive: true, mode: 0o750 });
        logger.info(`Created storage directory: ${name} at ${dirPath}`);
      }

      // Verify and set permissions on existing directories
      try {
        fs.chmodSync(dirPath, 0o750);
      } catch (error) {
        logger.warn(`Could not set permissions on ${dirPath}`, error);
      }
    });

    // Set restrictive permissions on base directory
    try {
      fs.chmodSync(STORAGE_BASE_DIR, 0o750);
    } catch (error) {
      logger.warn(`Could not set permissions on base directory`, error);
    }

    logger.info('Storage initialization complete');
  } catch (error) {
    logger.error('Failed to initialize storage directories', error);
    throw new Error('Storage initialization failed');
  }
};

/**
 * Validate file path to prevent directory traversal attacks
 */
export const validateFilePath = (filePath: string, allowedBase: string): boolean => {
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(allowedBase);
  
  // Ensure the resolved path is within the allowed base directory
  return resolvedPath.startsWith(resolvedBase);
};

/**
 * Sanitize filename to prevent malicious filenames
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove path separators and null bytes
  let sanitized = filename.replace(/[\/\\:\0]/g, '_');
  
  // Remove leading dots to prevent hidden files
  sanitized = sanitized.replace(/^\.+/, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 255 - ext.length) + ext;
  }
  
  return sanitized;
};

/**
 * Validate file type and size
 */
export const validateFile = (
  mimetype: string,
  size: number,
  filename: string,
  category: keyof typeof ALLOWED_FILE_TYPES = 'image'
): { valid: boolean; error?: string } => {
  // Check file extension
  const ext = path.extname(filename).toLowerCase() as typeof ALLOWED_EXTENSIONS[number];
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File extension ${ext} not allowed` };
  }

  // Check MIME type
  const allowedTypes = ALLOWED_FILE_TYPES[category];
  if (!allowedTypes.includes(mimetype as string)) {
    return { valid: false, error: `File type ${mimetype} not allowed for ${category}` };
  }

  // Check file size
  const sizeLimit = FILE_SIZE_LIMITS[category] || FILE_SIZE_LIMITS.default;
  if (size > sizeLimit) {
    return { 
      valid: false, 
      error: `File size ${size} bytes exceeds limit of ${sizeLimit} bytes` 
    };
  }

  return { valid: true };
};

/**
 * Generate secure random filename
 */
export const generateSecureFilename = (originalFilename: string): string => {
  const ext = path.extname(originalFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}${ext}`;
};

/**
 * Clean up temporary files older than specified age
 */
export const cleanupTempFiles = (maxAgeMs: number = 24 * 60 * 60 * 1000): void => {
  try {
    const tempDir = STORAGE_PATHS.temp;
    const now = Date.now();

    if (!fs.existsSync(tempDir)) {
      return;
    }

    const files = fs.readdirSync(tempDir);
    let deletedCount = 0;

    files.forEach((file) => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAgeMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} temporary files`);
    }
  } catch (error) {
    logger.error('Failed to cleanup temporary files', error);
  }
};

/**
 * Get storage usage statistics
 */
export const getStorageStats = (): Record<string, { files: number; size: number }> => {
  const stats: Record<string, { files: number; size: number }> = {};

  Object.entries(STORAGE_PATHS).forEach(([name, dirPath]) => {
    if (!fs.existsSync(dirPath)) {
      stats[name] = { files: 0, size: 0 };
      return;
    }

    try {
      const files = fs.readdirSync(dirPath);
      let totalSize = 0;

      files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        const fileStats = fs.statSync(filePath);
        if (fileStats.isFile()) {
          totalSize += fileStats.size;
        }
      });

      stats[name] = { files: files.length, size: totalSize };
    } catch (error) {
      logger.error(`Failed to get stats for ${name}`, error);
      stats[name] = { files: 0, size: 0 };
    }
  });

  return stats;
};
