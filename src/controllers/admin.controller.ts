import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import Shop from '../models/shop.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class AdminController {

    // --- User Management ---
    static async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const users = await User.find().select('-password');
            return ApiResponse.success(res, 200, 'Users fetched', { users });
        } catch (error) {
            next(error);
        }
    }

    static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = req.params;
            const { isVerified } = req.body;

            const user = await User.findByIdAndUpdate(userId, { isVerified }, { new: true });
            if (!user) throw new AppError('User not found', 404);

            return ApiResponse.success(res, 200, 'User status updated', { user });
        } catch (error) {
            next(error);
        }
    }

    // --- Seller/Shop Management & KYC ---
    static async getAllShops(req: Request, res: Response, next: NextFunction) {
        try {
            const shops = await Shop.find().populate('sellerId', 'name email');
            return ApiResponse.success(res, 200, 'Shops fetched', { shops });
        } catch (error) {
            next(error);
        }
    }

    static async approveShopKYC(req: Request, res: Response, next: NextFunction) {
        try {
            const { shopId } = req.params;
            const shop = await Shop.findById(shopId);
            if (!shop) throw new AppError('Shop not found', 404);

            shop.isVerified = true;
            // In a real app, we'd update a kycStatus field: shop.kycStatus = 'approved';
            await shop.save();

            return ApiResponse.success(res, 200, 'Shop KYC approved', { shop });
        } catch (error) {
            next(error);
        }
    }

    // --- Analytics Scaffolding ---
    static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
        try {
            const totalUsers = await User.countDocuments();
            const totalSellers = await User.countDocuments({ role: 'seller' });
            const totalShops = await Shop.countDocuments();
            // Add more stats as we integrate Orders (Order.countDocuments, totalRevenue, etc)

            return ApiResponse.success(res, 200, 'Stats fetched', {
                totalUsers,
                totalSellers,
                totalShops
            });
        } catch (error) {
            next(error);
        }
    }
}
