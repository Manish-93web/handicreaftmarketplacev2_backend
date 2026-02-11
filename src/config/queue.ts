import { Queue } from 'bullmq';
import logger from './logger';

const connection = {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
};

export const emailQueue = new Queue('email-queue', { connection });
export const productQueue = new Queue('product-queue', { connection });
export const payoutQueue = new Queue('payout-queue', { connection });

export const setupQueues = () => {
    logger.info('Queues initialized: email-queue, product-queue, payout-queue');
};
