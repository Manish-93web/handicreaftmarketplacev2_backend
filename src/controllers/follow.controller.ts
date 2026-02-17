import { Request, Response, NextFunction } from 'express';
import { Follow } from '../models/follow.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class FollowController {
    static async toggleFollow(req: Request, res: Response, next: NextFunction) {
        try {
            const { shopId } = req.body;
            const buyerId = req.user?._id;

            if (!shopId) throw new AppError('Shop ID is required', 400);

            const existingFollow = await Follow.findOne({ buyerId, shopId });

            if (existingFollow) {
                await Follow.findByIdAndDelete(existingFollow._id);
                return ApiResponse.success(res, 200, 'Unfollowed shop successfully', { followed: false });
            } else {
                await Follow.create({ buyerId, shopId });
                return ApiResponse.success(res, 201, 'Followed shop successfully', { followed: true });
            }
        } catch (error) {
            next(error);
        }
    }

    static async getFollowedShops(req: Request, res: Response, next: NextFunction) {
        try {
            const follows = await Follow.find({ buyerId: req.user?._id })
                .populate('shopId', 'name slug logo description banner isVerified performanceScore');

            const shops = follows.map(f => f.shopId);
            return ApiResponse.success(res, 200, 'Followed shops fetched', { shops });
        } catch (error) {
            next(error);
        }
    }

    static async checkFollowStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { shopId } = req.params;
            const follow = await Follow.findOne({ buyerId: req.user?._id, shopId });
            return ApiResponse.success(res, 200, 'Follow status checked', { followed: !!follow });
        } catch (error) {
            next(error);
        }
    }
}
