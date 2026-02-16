import { Request, Response, NextFunction } from 'express';
import { Report } from '../models/report.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class ReportController {

    // Create Report
    static async createReport(req: Request, res: Response, next: NextFunction) {
        try {
            const { targetType, targetId, reason, description } = req.body;

            const report = await Report.create({
                reporterId: req.user?._id,
                targetType,
                targetId,
                reason,
                description
            });

            return ApiResponse.success(res, 201, 'Report submitted successfully', { report });
        } catch (error) {
            next(error);
        }
    }

    // Get All Reports (Admin)
    static async getAllReports(req: Request, res: Response, next: NextFunction) {
        try {
            const { status } = req.query;
            const filter: any = {};
            if (status) filter.status = status;

            const reports = await Report.find(filter)
                .populate('reporterId', 'name email')
                .sort('-createdAt');

            return ApiResponse.success(res, 200, 'Reports fetched', { reports });
        } catch (error) {
            next(error);
        }
    }

    // Update Report Status (Admin)
    static async resolveReport(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status, actionTaken } = req.body; // 'resolved' | 'dismissed'

            const report = await Report.findByIdAndUpdate(
                id,
                {
                    status,
                    actionTaken,
                    resolvedBy: req.user?._id
                },
                { returnDocument: 'after' }
            );

            if (!report) throw new AppError('Report not found', 404);

            return ApiResponse.success(res, 200, 'Report updated', { report });
        } catch (error) {
            next(error);
        }
    }
}
