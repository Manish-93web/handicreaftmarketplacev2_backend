import { Request, Response, NextFunction } from 'express';
import Review from '../models/review.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { Order, SubOrder } from '../models/order.model';

export class ReviewController {

    static async getProductReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const reviews = await Review.find({ productId, status: 'approved' })
                .populate('userId', 'name avatar')
                .sort('-createdAt');

            return ApiResponse.success(res, 200, 'Reviews fetched', { reviews });
        } catch (error) {
            next(error);
        }
    }

    static async submitReview(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId, rating, comment, images } = req.body;

            // 1. Check for existing review
            const existingReview = await Review.findOne({ productId, userId: req.user?._id });
            if (existingReview) throw new AppError('You have already reviewed this product', 400);

            // 2. Check for Verified Purchase
            const verifiedPurchase = await SubOrder.findOne({
                'items.productId': productId,
            }).populate({
                path: 'orderId',
                match: { buyerId: req.user?._id, paymentStatus: 'paid' }
            });

            const isVerifiedPurchase = !!(verifiedPurchase && verifiedPurchase.orderId);

            const review = await Review.create({
                productId,
                userId: req.user?._id,
                rating,
                comment,
                images,
                isVerifiedPurchase,
                status: 'approved' // Auto-approve for MVP
            });

            return ApiResponse.success(res, 201, 'Review submitted', { review });
        } catch (error) {
            next(error);
        }
    }
}
