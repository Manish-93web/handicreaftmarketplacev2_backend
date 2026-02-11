import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/auditLog.model';

/**
 * Middleware to log sensitive actions to the AuditLog collection.
 * @param action - The action string (e.g., 'user_login', 'password_change')
 * @param resource - The resource identifier (e.g., 'auth', 'user_profile')
 */
export const logAudit = (action: string, resource: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // We wrap the actual logging in a 'finish' listener to log AFTER request completion
        res.on('finish', async () => {
            try {
                // Only log if the request was successful (2xx) or specific errors maybe?
                // For now, logging all attempts that reach here
                await AuditLog.create({
                    userId: req.user?._id,
                    action,
                    resource,
                    ipAddress: req.ip || '',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    metadata: {
                        method: req.method,
                        path: req.originalUrl,
                        status: res.statusCode,
                        query: req.query,
                        // Avoid logging sensitive body data like passwords!
                        body: action.includes('login') ? { email: req.body.email } : req.body
                    }
                });
            } catch (error) {
                console.error('Audit Logging Error:', error);
            }
        });
        next();
    };
};
