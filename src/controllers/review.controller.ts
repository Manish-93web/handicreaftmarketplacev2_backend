import { Request, Response, NextFunction } from 'express';
import { Review } from '../models/review.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { Order, SubOrder } from '../models/order.model';
import { Product } from '../models/product.model';
import mongoose from 'mongoose';

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
            const { productId, rating, comment, images, videoUrl } = req.body;

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
                videoUrl,
                isVerifiedPurchase,
                status: 'pending' // Moderation by default in Phase 7
            });

            // Update Product Ratings
            await ReviewController.calcAverageRatings(productId);

            return ApiResponse.success(res, 201, 'Review submitted', { review });
        } catch (error) {
            next(error);
        }
    }

    static async getAllReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const reviews = await Review.find()
                .populate('productId', 'title')
                .populate('userId', 'name avatar email')
                .sort('-createdAt');
            return ApiResponse.success(res, 200, 'All reviews fetched', { reviews });
        } catch (error) {
            next(error);
        }
    }

    static async editReview(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { rating, comment, images, videoUrl } = req.body;

            const review = await Review.findOne({ _id: id, userId: req.user?._id });
            if (!review) throw new AppError('Review not found or unauthorized', 404);

            // 48-hour edit window
            const createdAt = new Date((review as any).createdAt).getTime();
            const now = new Date().getTime();
            const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

            if (hoursSinceCreation > 48) {
                throw new AppError('The edit window for this review (48h) has passed', 400);
            }

            review.rating = rating || review.rating;
            review.comment = comment || review.comment;
            review.images = images || review.images;
            review.videoUrl = videoUrl || review.videoUrl;
            await review.save();

            await ReviewController.calcAverageRatings(review.productId.toString());

            return ApiResponse.success(res, 200, 'Review updated successfully', { review });
        } catch (error) {
            next(error);
        }
    }

    static async voteHelpful(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const review = await Review.findByIdAndUpdate(id, { $inc: { helpfulVotes: 1 } }, { new: true });
            if (!review) throw new AppError('Review not found', 404);
            return ApiResponse.success(res, 200, 'Vote recorded', { review });
        } catch (error) {
            next(error);
        }
    }

    static async updateReviewStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const review = await Review.findByIdAndUpdate(id, { status }, { new: true });
            if (!review) throw new AppError('Review not found', 404);

            // Recalculate ratings for the product
            await ReviewController.calcAverageRatings(review.productId.toString());

            return ApiResponse.success(res, 200, 'Review status updated', { review });
        } catch (error) {
            next(error);
        }
    }

    static async deleteReview(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const review = await Review.findByIdAndDelete(id);
            if (!review) throw new AppError('Review not found', 404);

            // Recalculate ratings
            await ReviewController.calcAverageRatings(review.productId.toString());

            return ApiResponse.success(res, 200, 'Review deleted');
        } catch (error) {
            next(error);
        }
    }

    private static async calcAverageRatings(productId: string) {
        const stats = await Review.aggregate([
            {
                $match: { productId: new mongoose.Types.ObjectId(productId), status: 'approved' }
            },
            {
                $group: {
                    _id: '$productId',
                    nRating: { $sum: 1 },
                    avgRating: { $avg: '$rating' }
                }
            }
        ]);

        if (stats.length > 0) {
            await Product.findByIdAndUpdate(productId, {
                ratings: {
                    average: Math.round(stats[0].avgRating * 10) / 10,
                    count: stats[0].nRating
                }
            });

            // Also update Seller/Shop Overall Rating
            const product = await Product.findById(productId);
            if (product) {
                const listing = await mongoose.model('SellerListing').findOne({ productId });
                if (listing) {
                    const shopId = listing.shopId;
                    const shopProducts = await mongoose.model('SellerListing').find({ shopId }).distinct('productId');
                    const shopStats = await Product.aggregate([
                        { $match: { _id: { $in: shopProducts } } },
                        { $group: { _id: null, avg: { $avg: '$ratings.average' } } }
                    ]);
                    if (shopStats.length > 0) {
                        await mongoose.model('Shop').findByIdAndUpdate(shopId, { performanceScore: shopStats[0].avg * 20 }); // Score 0-100
                    }
                }
            }
        } else {
            await Product.findByIdAndUpdate(productId, {
                ratings: { average: 0, count: 0 }
            });
        }
    }
}
