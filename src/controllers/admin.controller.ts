import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { Shop } from '../models/shop.model';
import { Product } from '../models/product.model';
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
            const { kycStatus } = req.query;
            const filter: any = {};
            if (kycStatus) filter.kycStatus = kycStatus;

            const shops = await Shop.find(filter).populate('sellerId', 'name email').sort({ createdAt: -1 });
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
            shop.kycStatus = 'approved';
            shop.rejectionReason = undefined; // Clear any previous rejection
            shop.rejectedAt = undefined;
            await (shop as any).save();

            return ApiResponse.success(res, 200, 'Shop KYC approved', { shop });
        } catch (error) {
            next(error);
        }
    }

    static async rejectShopKYC(req: Request, res: Response, next: NextFunction) {
        try {
            const { shopId } = req.params;
            const { reason } = req.body;

            if (!reason) throw new AppError('Rejection reason is required', 400);

            const shop = await Shop.findById(shopId);
            if (!shop) throw new AppError('Shop not found', 404);

            shop.isVerified = false;
            shop.kycStatus = 'rejected';
            shop.rejectionReason = reason;
            shop.rejectedAt = new Date();
            await (shop as any).save();

            return ApiResponse.success(res, 200, 'Shop KYC rejected', { shop });
        } catch (error) {
            next(error);
        }
    }

    // --- Product Management ---
    static async reviewProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const { status } = req.body; // 'approved' | 'rejected'

            if (!['approved', 'rejected'].includes(status)) {
                throw new AppError('Invalid status', 400);
            }

            const product = await Product.findByIdAndUpdate(
                productId,
                {
                    approvalStatus: status,
                    isPublished: status === 'approved'
                },
                { new: true }
            );

            if (!product) throw new AppError('Product not found', 404);

            return ApiResponse.success(res, 200, `Product ${status} successfully`, { product });
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
