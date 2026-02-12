import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import mongoose from 'mongoose';
import { connectRedis } from './config/redis';
import logger from './config/logger';

// Remove line 7 later if it's still there

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/handicraft_marketplace';

// Connect to Database
const startServer = async () => {
    try {
        await connectRedis();

        try {
            await mongoose.connect(MONGO_URI, {
                serverSelectionTimeoutMS: 5000,
            });
            logger.info('Connected to MongoDB');
        } catch (dbError) {
            logger.error('MongoDB connection error:', dbError);
            if (process.env.NODE_ENV === 'production') {
                process.exit(1);
            }
            logger.warn('Proceeding without MongoDB (Database features will fail)');
        }

        const server = app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });

        const { SocketService } = require('./services/socket.service');
        SocketService.init(server);
    } catch (error) {
        logger.error('Critical server startup error:', error);
        process.exit(1);
    }
};

startServer();
