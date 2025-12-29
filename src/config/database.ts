import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';
import { getRequiredSecret } from './secrets';

// Validate required environment variables
if (!process.env.DB_HOST && process.env.NODE_ENV !== 'test') {
  throw new Error('DB_HOST environment variable is required');
}
if (!process.env.DB_NAME && process.env.NODE_ENV !== 'test') {
  throw new Error('DB_NAME environment variable is required');
}
if (!process.env.DB_USER && process.env.NODE_ENV !== 'test') {
  throw new Error('DB_USER environment variable is required');
}
if (!process.env.DB_PASSWORD && process.env.NODE_ENV !== 'test') {
  throw new Error('DB_PASSWORD environment variable is required');
}

// SSL/TLS Configuration for Production
const isProduction = process.env.NODE_ENV === 'production';
const sslEnabled = process.env.DB_SSL === 'true' || isProduction;

// CRITICAL: Production MUST use SSL/TLS - no fallback to unencrypted
if (isProduction && !sslEnabled) {
  throw new Error(
    'CRITICAL SECURITY ERROR: Database SSL/TLS is REQUIRED in production. Set DB_SSL=true'
  );
}

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'test_db',
  user: process.env.DB_USER || 'test_user',
  password: process.env.DB_PASSWORD || 'test_password',
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // SSL/TLS Configuration
  ssl: sslEnabled
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: process.env.DB_SSL_CA,
        cert: process.env.DB_SSL_CERT,
        key: process.env.DB_SSL_KEY,
      }
    : false,
};

// Initialize pool with async password loading from secrets manager
let pool: Pool;

const initializePool = async (): Promise<Pool> => {
  // Load password from secrets manager in production
  if (process.env.NODE_ENV === 'production' && process.env.SECRETS_BACKEND !== 'env') {
    try {
      const dbPassword = await getRequiredSecret('DB_PASSWORD');
      poolConfig.password = dbPassword;
      logger.info('Loaded database password from secrets manager');
    } catch (error) {
      logger.error('Failed to load database password from secrets manager', { error });
      throw error;
    }
  }

  const newPool = new Pool(poolConfig);
  
  newPool.on('connect', () => {
    logger.info('Database connection established', {
      ssl: sslEnabled,
      host: poolConfig.host,
      database: poolConfig.database,
    });
  });

  newPool.on('error', (err) => {
    logger.error('Unexpected database error', err);
    process.exit(-1);
  });

  return newPool;
};

// For synchronous initialization (test/dev with env vars)
if (process.env.NODE_ENV !== 'production' || process.env.SECRETS_BACKEND === 'env') {
  pool = new Pool(poolConfig);
  
  pool.on('connect', () => {
    logger.info('Database connection established', {
      ssl: sslEnabled,
      host: poolConfig.host,
      database: poolConfig.database,
    });
  });

  pool.on('error', (err) => {
    logger.error('Unexpected database error', err);
    process.exit(-1);
  });
} else {
  // Production with secrets manager - must call initializePool()
  pool = null as any; // Will be initialized async
}

export { initializePool };



export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Query error', { text, error });
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Monkey patch the query method to add logging
  (client as any).query = (...args: any[]): any => {
    const start = Date.now();
    const result = (originalQuery as any)(...args);
    if (result && typeof result.then === 'function') {
      return result.then((res: any) => {
        const duration = Date.now() - start;
        logger.debug('Executed query', { duration, rows: res.rowCount });
        return res;
      });
    }
    return result;
  };

  // Monkey patch the release method to add logging
  client.release = () => {
    logger.debug('Client released');
    return originalRelease();
  };

  return client;
};

export default pool;
