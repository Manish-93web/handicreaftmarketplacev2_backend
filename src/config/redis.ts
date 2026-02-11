import { createClient } from 'redis';
import logger from './logger';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        logger.error('Could not connect to Redis', err);
        process.exit(1);
    }
};

export default redisClient;
