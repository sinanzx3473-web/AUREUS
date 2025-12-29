import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Validate required environment variables
if (!process.env.REDIS_HOST && process.env.NODE_ENV !== 'test') {
  throw new Error('REDIS_HOST environment variable is required');
}

const redisConfig = process.env.REDIS_HOST ? {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
} : {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

export const redis = new Redis(redisConfig);

redis.on('connect', () => {
  logger.info('Redis connection established');
});

redis.on('error', (err) => {
  logger.error('Redis connection error', err);
});

redis.on('ready', () => {
  logger.info('Redis is ready');
});

export default redis;
