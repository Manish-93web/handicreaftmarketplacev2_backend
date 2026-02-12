import { Request, Response, NextFunction } from 'express';
import { Order, SubOrder } from '../models/order.model';
import { User } from '../models/user.model';
import { Shop } from '../models/shop.model';
import { Product } from '../models/product.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import mongoose from 'mongoose';

export class AnalyticsController {

    // --- Admin Dashboard ---
    static async getAdminAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            // 1. GMV & Commission (All Paid Orders)
            const financials = await Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                {
                    $group: {
                        _id: null,
                        totalGMV: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const gmv = financials.length > 0 ? financials[0].totalGMV : 0;
            const totalOrders = financials.length > 0 ? financials[0].count : 0;
            const platformRevenue = gmv * 0.10; // Assuming flat 10% commission

            // 2. User Stats
            const totalUsers = await User.countDocuments({ role: 'user' });
            const totalSellers = await User.countDocuments({ role: 'seller' });

            // 3. Active Users (Last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const activeUsers = await Order.distinct('buyerId', {
                createdAt: { $gte: thirtyDaysAgo }
            });

            return ApiResponse.success(res, 200, 'Admin analytics fetched', {
                financials: {
                    totalGMV: gmv,
                    totalCommission: platformRevenue,
                    totalOrders: totalOrders
                },
                users: {
                    totalUsers: totalUsers,
                    totalSellers: totalSellers,
                    activeUsers: activeUsers.length
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // --- Seller Dashboard ---
    static async getSellerAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const sellerId = req.user?._id;
            // Find shop for this seller
            const shop = await Shop.findOne({ sellerId });
            if (!shop) throw new AppError('Shop not found for this seller', 404);

            // 1. Total Sales & Orders
            const salesStats = await SubOrder.aggregate([
                { $match: { shopId: shop._id, status: { $ne: 'cancelled' } } }, // Exclude cancelled
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$subTotal' },
                        orderCount: { $sum: 1 }
                    }
                }
            ]);

            const totalSales = salesStats.length > 0 ? salesStats[0].totalSales : 0;
            const orderCount = salesStats.length > 0 ? salesStats[0].orderCount : 0;

            // 2. Top Selling Products
            const topProducts = await SubOrder.aggregate([
                { $match: { shopId: shop._id, status: { $ne: 'cancelled' } } },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.productId',
                        title: { $first: '$items.title' },
                        totalSold: { $sum: '$items.quantity' },
                        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 5 }
            ]);

            // 3. Recent Orders
            const recentOrders = await SubOrder.find({ shopId: shop._id })
                .sort('-createdAt')
                .limit(5)
                .select('orderId subTotal status createdAt');

            return ApiResponse.success(res, 200, 'Seller analytics fetched', {
                totalSales,
                orderCount,
                topProducts,
                recentOrders
            });

        } catch (error) {
            next(error);
        }
    }

    // --- Reporting (Shared) ---
    static async getReports(req: Request, res: Response, next: NextFunction) {
        try {
            const { startDate, endDate, type } = req.query;
            // type: 'sales' | 'inventory'

            if (!startDate || !endDate) {
                throw new AppError('Start date and end date are required', 400);
            }

            const start = new Date(startDate as string);
            const end = new Date(endDate as string);

            let data = [];

            if (type === 'sales') {
                // Admin sees all, Seller sees only theirs
                const matchStage: any = {
                    createdAt: { $gte: start, $lte: end },
                    status: { $ne: 'cancelled' }
                };

                if (req.user?.role === 'seller') {
                    const shop = await Shop.findOne({ sellerId: req.user._id });
                    if (shop) matchStage.shopId = shop._id;
                }

                data = await SubOrder.find(matchStage).select('subTotal status createdAt shopId');
            }

            // Simple JSON response for now. Frontend can convert to CSV.
            return ApiResponse.success(res, 200, 'Report generated', {
                range: { start, end },
                type,
                count: data.length,
                data
            });

        } catch (error) {
            next(error);
        }
    }
}
