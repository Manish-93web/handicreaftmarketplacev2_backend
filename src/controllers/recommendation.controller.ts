import { Request, Response, NextFunction } from 'express';
import { UserActivity } from '../models/userActivity.model';
import { Product } from '../models/product.model';
import { Order } from '../models/order.model'; // For trending based on sales
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class RecommendationController {

    // Helper: Fire and forget log
    static async logActivity(userId: string, productId: string, action: 'view' | 'search', metadata?: any) {
        try {
            await UserActivity.create({ userId, productId, action, metadata });
        } catch (error) {
            console.error('Failed to log user activity:', error);
            // Non-blocking, so we don't throw
        }
    }

    static async getTrendingProducts(req: Request, res: Response, next: NextFunction) {
        try {
            // Logic: Top selling products in last 7 days from SubOrders/Orders
            // Simplified: Just return top viewed products for now or random "Featured" if no sales data yet.
            // Let's use high rated + published products for now as "Trending"
            const products = await Product.find({ isPublished: true })
                .sort({ averageRating: -1, createdAt: -1 })
                .limit(10)
                .populate('category', 'name slug');

            return ApiResponse.success(res, 200, 'Trending products fetched', { products });
        } catch (error) {
            next(error);
        }
    }

    static async getRecentlyViewed(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;
            // Get unique product IDs from last Views
            const activities = await UserActivity.find({ userId, action: 'view' })
                .sort({ createdAt: -1 })
                .limit(20)
                .populate('productId');

            // Deduplicate
            const uniqueProducts = new Map();
            activities.forEach(act => {
                if (act.productId && !uniqueProducts.has((act.productId as any)._id.toString())) {
                    uniqueProducts.set((act.productId as any)._id.toString(), act.productId);
                }
            });

            const products = Array.from(uniqueProducts.values()).slice(0, 10);

            return ApiResponse.success(res, 200, 'Recently viewed products fetched', { products });
        } catch (error) {
            next(error);
        }
    }

    static async getPersonalizedRecommendations(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;

            // 1. Analyze recent category interest
            const recentViews = await UserActivity.find({ userId, action: 'view' })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('productId');

            const interestingCategories = new Set();
            recentViews.forEach(act => {
                if (act.productId && (act.productId as any).category) {
                    interestingCategories.add((act.productId as any).category.toString());
                }
            });

            const categoryIds = Array.from(interestingCategories);

            let query: any = { isPublished: true };
            if (categoryIds.length > 0) {
                query.category = { $in: categoryIds };
            }

            const recommendations = await Product.find(query)
                .sort({ averageRating: -1 }) // Show best rated in those categories
                .limit(10)
                .populate('category', 'name slug');

            return ApiResponse.success(res, 200, 'Recommended for you', { products: recommendations });
        } catch (error) {
            next(error);
        }
    }
}
