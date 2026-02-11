import app from './app';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectRedis } from './config/redis';
import logger from './config/logger';

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/handicraft_marketplace';

// Connect to Database
const startServer = async () => {
    try {
        await connectRedis();
        await mongoose.connect(MONGO_URI);
        logger.info('Connected to MongoDB');

        const server = app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });

        const { SocketService } = require('./services/socket.service');
        SocketService.init(server);
    } catch (error) {
        logger.error('Server startup error:', error);
        process.exit(1);
    }
};

startServer();
