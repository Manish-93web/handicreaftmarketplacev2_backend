import { Request, Response, NextFunction } from 'express';

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            context: {
                locale: string;
                currency: string;
            };
        }
    }
}

export const i18nMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const locale = req.headers['accept-language']?.split(',')[0] || 'en-US';
    const currency = (req.headers['x-currency'] as string)?.toUpperCase() || 'INR';

    req.context = {
        locale,
        currency
    };

    next();
};
