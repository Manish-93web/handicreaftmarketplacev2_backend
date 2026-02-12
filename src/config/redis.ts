import { createClient } from 'redis';
import logger from './logger';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (process.env.NODE_ENV !== 'production' && retries > 1) {
                return false; // Stop retrying in development
            }
            return Math.min(retries * 100, 3000);
        },
        connectTimeout: 5000,
    }
});

redisClient.on('error', (err) => {
    // Only log if not a standard connection error in development
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev || (err.code !== 'ECONNREFUSED' && err.code !== 'ECONNRESET')) {
        logger.error(`Redis Client Error [${err.code || 'NO_CODE'}]:`, err);
    }
});
redisClient.on('connect', () => logger.info('Redis Client Connected'));

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        logger.error('Could not connect to Redis', err);
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        logger.warn('Proceeding without Redis (some features like caching and notifications may be affected)');
    }
};

export default redisClient;
