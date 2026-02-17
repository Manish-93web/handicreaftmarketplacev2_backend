import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { Shop } from '../models/shop.model';
import { Product } from '../models/product.model';
import { SellerListing } from '../models/sellerListing.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { NotificationService } from '../services/notification.service';
import crypto from 'crypto';

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

            const user = await User.findByIdAndUpdate(userId, { isVerified }, { returnDocument: 'after' });
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
            const shop = await Shop.findById(shopId).populate('sellerId');
            if (!shop) throw new AppError('Shop not found', 404);

            const user = await User.findById(shop.sellerId);
            if (!user) throw new AppError('Seller not found', 404);

            // 1. Generate Secure Password
            const password = crypto.randomBytes(8).toString('hex'); // 16 target characters

            // 2. Update User
            user.password = password;
            user.isVerified = true;
            await user.save();

            // 3. Update Shop
            shop.isVerified = true;
            shop.kycStatus = 'approved';
            shop.rejectionReason = undefined;
            shop.rejectedAt = undefined;
            await (shop as any).save();

            // 4. Notify Seller
            await NotificationService.sendSellerApproval(
                user.email,
                user.phone || '',
                user.name,
                { email: user.email, password }
            );

            return ApiResponse.success(res, 200, 'Shop KYC approved and credentials sent to seller', {
                shop,
                generatedPassword: password // Shared in response as per user request "show in admin pannel"
            });
        } catch (error) {
            next(error);
        }
    }

    static async rejectShopKYC(req: Request, res: Response, next: NextFunction) {
        try {
            const { shopId } = req.params;
            const { reason } = req.body;

            if (!reason) throw new AppError('Rejection reason is required', 400);

            const shop = await Shop.findById(shopId).populate('sellerId');
            if (!shop) throw new AppError('Shop not found', 404);

            const user = await User.findById(shop.sellerId);
            if (!user) throw new AppError('Seller not found', 404);

            shop.isVerified = false;
            shop.kycStatus = 'rejected';
            shop.rejectionReason = reason;
            shop.rejectedAt = new Date();
            await (shop as any).save();

            // Notify Seller
            await NotificationService.sendSellerRejection(
                user.email,
                user.phone || '',
                user.name,
                reason
            );

            return ApiResponse.success(res, 200, 'Shop KYC rejected and seller notified', { shop });
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
                { returnDocument: 'after' }
            ).populate('category');

            if (!product) throw new AppError('Product not found', 404);

            // Notify Seller
            const listing = await SellerListing.findOne({ productId: product._id }).populate({
                path: 'shopId',
                populate: { path: 'sellerId' }
            });

            if (listing && (listing.shopId as any).sellerId) {
                const seller = (listing.shopId as any).sellerId;
                const shop = listing.shopId as any;

                if (status === 'approved') {
                    // Send in-app notification
                    await NotificationService.sendNotification(
                        seller._id,
                        'product_approved',
                        'Product Approved!',
                        `Your product "${product.title}" has been approved and is now live.`
                    );
                    // Send email and SMS
                    await NotificationService.sendProductApproval(
                        seller.email,
                        seller.phone || '',
                        seller.name,
                        product.title
                    );
                } else if (status === 'rejected') {
                    // Send in-app notification
                    await NotificationService.sendNotification(
                        seller._id,
                        'product_rejected',
                        'Product Review Update',
                        `Your product "${product.title}" requires changes or was rejected.`
                    );
                    // Send email and SMS
                    await NotificationService.sendProductRejection(
                        seller.email,
                        seller.phone || '',
                        seller.name,
                        product.title
                    );
                }
            }

            return ApiResponse.success(res, 200, `Product ${status} successfully`, { product });
        } catch (error) {
            next(error);
        }
    }

    static async getPendingProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const products = await Product.find({ approvalStatus: 'pending' })
                .populate('category', 'name')
                .sort({ createdAt: -1 });

            // We also want to know which shop(s) have listings for these products
            const productsWithShops = await Promise.all(products.map(async (product) => {
                const listings = await SellerListing.find({ productId: product._id })
                    .populate('shopId', 'name slug');
                return {
                    ...product.toObject(),
                    listings
                };
            }));

            return ApiResponse.success(res, 200, 'Pending products fetched', { products: productsWithShops });
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
