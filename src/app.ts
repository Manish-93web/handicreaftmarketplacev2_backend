import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

const app: Express = express();

import authRoutes from './routes/auth.routes';
import cookieParser from 'cookie-parser';
import shopRoutes from './routes/shop.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import addressRoutes from './routes/address.routes';
import orderRoutes from './routes/order.routes';
import walletRoutes from './routes/wallet.routes';
import reviewRoutes from './routes/review.routes';
import chatRoutes from './routes/chat.routes';
import adminRoutes from './routes/admin.routes';
import couponRoutes from './routes/coupon.routes';
import paymentRoutes from './routes/payment.routes';
import rateLimit from 'express-rate-limit';

// Middleware
app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use('/api', limiter);

app.use(cors({
    origin: 'http://localhost:3000', // Allow frontend
    credentials: true
}));
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());

import { csrfProtection } from './middlewares/csrf.middleware';
app.use(csrfProtection);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/shops', shopRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/payments', paymentRoutes);


import { globalErrorHandler } from './middlewares/error.middleware';
import { AppError } from './utils/AppError';

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

// Handle undefined routes
app.all('*', (req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

import { SeedController } from './controllers/seed.controller';
app.get('/api/v1/seed', SeedController.seedCategories);

export default app;

