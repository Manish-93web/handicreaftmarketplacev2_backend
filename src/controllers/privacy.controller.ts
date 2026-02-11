import { Request, Response, NextFunction } from 'express';
import { PrivacyRequest } from '../models/privacyRequest.model';
import { User } from '../models/user.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class PrivacyController {
    // Request Data Export
    static async requestDataExport(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;

            // Check if a pending export already exists
            const existing = await PrivacyRequest.findOne({ userId, type: 'data_export', status: 'pending' });
            if (existing) {
                throw new AppError('A data export request is already in progress.', 400);
            }

            const privacyRequest = await PrivacyRequest.create({
                userId,
                type: 'data_export',
                status: 'pending'
            });

            // In real app, trigger a background worker (BullMQ) to package data
            // For now, mockup the process start
            return ApiResponse.success(res, 202, 'Data export requested. You will be notified when it is ready.');
        } catch (error) {
            next(error);
        }
    }

    // Request Account Deletion (GDPR "Right to be Forgotten")
    static async requestAccountDeletion(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;
            const { reason } = req.body;

            // Schedule deletion for 30 days from now
            const deletionDate = new Date();
            deletionDate.setDate(deletionDate.getDate() + 30);

            await User.findByIdAndUpdate(userId, {
                deletionScheduledAt: deletionDate
            });

            await PrivacyRequest.create({
                userId,
                type: 'account_deletion',
                status: 'pending',
                reason
            });

            return ApiResponse.success(res, 200, `Account deletion scheduled for ${deletionDate.toDateString()}. You can cancel this request within the next 30 days.`);
        } catch (error) {
            next(error);
        }
    }

    // Cancel Account Deletion
    static async cancelAccountDeletion(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;

            await User.findByIdAndUpdate(userId, {
                $unset: { deletionScheduledAt: 1 }
            });

            await PrivacyRequest.updateMany(
                { userId, type: 'account_deletion', status: 'pending' },
                { status: 'cancelled' }
            );

            return ApiResponse.success(res, 200, 'Account deletion has been cancelled.');
        } catch (error) {
            next(error);
        }
    }

    // Update Privacy Preferences
    static async updatePrivacyPreferences(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;
            const { privacyPreferences } = req.body;

            const user = await User.findByIdAndUpdate(userId, {
                privacyPreferences
            }, { new: true });

            return ApiResponse.success(res, 200, 'Privacy preferences updated successfully', {
                privacyPreferences: user?.privacyPreferences
            });
        } catch (error) {
            next(error);
        }
    }
}
