import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    // Generate CSRF token if it doesn't exist in cookie
    if (!req.cookies['XSRF-TOKEN']) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie('XSRF-TOKEN', token, {
            httpOnly: false, // Must be accessible by frontend to read and send back in header
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
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
        return res.status(403).json({
            status: 'error',
            message: 'Invalid or missing CSRF token'
        });
    }

    // CSRF Token Rotation: Generate a new token for the next request
    const newToken = crypto.randomBytes(32).toString('hex');
    res.cookie('XSRF-TOKEN', newToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });

    next();
};
