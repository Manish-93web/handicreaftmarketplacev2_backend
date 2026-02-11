import { Response } from 'express';

export class ApiResponse {
    static success(res: Response, statusCode: number, message: string, data: any = {}) {
        return res.status(statusCode).json({
            status: 'success',
            message,
            data,
        });
    }

    static error(res: Response, statusCode: number, message: string) {
        return res.status(statusCode).json({
            status: 'error',
            message,
        });
    }
}
