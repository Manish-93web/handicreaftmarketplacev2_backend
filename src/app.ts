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
import legalRoutes from './routes/legal.routes';
import privacyRoutes from './routes/privacy.routes';
import customOrderRoutes from './routes/customOrder.routes';
import recommendationRoutes from './routes/recommendation.routes';
import payoutRoutes from './routes/payout.routes';
import analyticsRoutes from './routes/analytics.routes';
import notificationRoutes from './routes/notification.routes';
import reportRoutes from './routes/report.routes';
import rateLimit from 'express-rate-limit';
import { i18nMiddleware } from './middlewares/i18n.middleware';

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"], // Allow Cloudinary images
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));

// Global Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Brute Force Protection for Auth
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login/register attempts per hour
    message: 'Too many auth attempts from this IP, please try again after an hour'
});

app.use('/api', limiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

app.use(cors({
    origin: 'http://localhost:3000', // Allow frontend
    credentials: true
}));
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());

import { csrfProtection } from './middlewares/csrf.middleware';
app.use(express.static('public'));
app.use(i18nMiddleware);
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
app.use('/api/v1/legal', legalRoutes);
app.use('/api/v1/privacy', privacyRoutes);
app.use('/api/v1/custom-orders', customOrderRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);
app.use('/api/v1/payouts', payoutRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);


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

