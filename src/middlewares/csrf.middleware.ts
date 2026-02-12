import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../config/logger';

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    // Generate CSRF token if it doesn't exist in cookie
    if (!req.cookies['XSRF-TOKEN']) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie('XSRF-TOKEN', token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        logger.debug('Generated new CSRF token for cookie-less request');
    }

    // Skip check for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Verify token for state-changing methods
    const csrfTokenInHeader = req.headers['x-xsrf-token'];
    const csrfTokenInCookie = req.cookies['XSRF-TOKEN'];

    if (!csrfTokenInHeader || csrfTokenInHeader !== csrfTokenInCookie) {
        logger.warn(`CSRF validation failed for ${req.method} ${req.originalUrl}. Header: ${csrfTokenInHeader ? 'PRESENT' : 'MISSING'}, Cookie: ${csrfTokenInCookie ? 'PRESENT' : 'MISSING'}, Match: ${csrfTokenInHeader === csrfTokenInCookie}`);

        // Log details if not production
        if (process.env.NODE_ENV !== 'production') {
            logger.debug(`CSRF Tokens - Header: ${csrfTokenInHeader}, Cookie: ${csrfTokenInCookie}`);
        }

        return res.status(403).json({
            status: 'error',
            message: 'Invalid or missing CSRF token'
        });
    }

    // CSRF Token Rotation: Generate a new token for the next request
    // Skip rotation in development if causing issues, or just always do it
    const newToken = crypto.randomBytes(32).toString('hex');
    res.cookie('XSRF-TOKEN', newToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });

    next();
};
