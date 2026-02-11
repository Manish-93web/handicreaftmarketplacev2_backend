import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/notification.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import mongoose from 'mongoose';

export class NotificationController {

    // Internal helper to create notification
    static async sendNotification(recipientId: string, type: string, title: string, message: string, data?: any) {
        try {
            await Notification.create({
                recipientId,
                type,
                title,
                message,
                data
            });
            // TODO: Emit Socket.io event here for real-time update
        } catch (error) {
            console.error('Failed to create notification', error);
        }
    }

    // Get My Notifications
    static async getMyNotifications(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            const notifications = await Notification.find({ recipientId: req.user?._id })
                .sort('-createdAt')
                .skip(skip)
                .limit(limit);

            const total = await Notification.countDocuments({ recipientId: req.user?._id });
            const unreadCount = await Notification.countDocuments({ recipientId: req.user?._id, isRead: false });

            return ApiResponse.success(res, 200, 'Notifications fetched', {
                notifications,
                total,
                page,
                unreadCount
            });
        } catch (error) {
            next(error);
        }
    }

    // Mark as Read
    static async markAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            // If ID is 'all', mark all as read
            if (id === 'all') {
                await Notification.updateMany(
                    { recipientId: req.user?._id, isRead: false },
                    { isRead: true }
                );
                return ApiResponse.success(res, 200, 'All notifications marked as read');
            }

            const notification = await Notification.findOneAndUpdate(
                { _id: id, recipientId: req.user?._id },
                { isRead: true },
                { new: true }
            );

            if (!notification) throw new AppError('Notification not found', 404);

            return ApiResponse.success(res, 200, 'Notification marked as read', { notification });
        } catch (error) {
            next(error);
        }
    }
}
