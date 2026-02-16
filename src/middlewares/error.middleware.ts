import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../config/logger';

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        logger.error(err);
    }

    if (err.name === 'CastError') {
        err = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
    }

    if (err.name === 'JsonWebTokenError') {
        err = new AppError('Invalid token. Please log in again!', 401);
    }

    if (err.name === 'TokenExpiredError') {
        err = new AppError('Your token has expired! Please log in again.', 401);
    }

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
