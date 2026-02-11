import { Request, Response, NextFunction } from 'express';
import Shop from '../models/shop.model';
import User from '../models/user.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class ShopController {

    static async createShop(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, slogan, description } = req.body;
            const sellerId = req.user?._id;

            // Check if user already has a shop
            const existingShop = await Shop.findOne({ sellerId });
            if (existingShop) {
                throw new AppError('User already has a shop', 400);
            }

            // Generate slug from name
            const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

            const shop = await Shop.create({
                sellerId,
                name,
                slug,
                description,
                kycStatus: 'pending'
            });

            // Update user role to seller if not already
            if (req.user?.role !== 'seller' && req.user?.role !== 'admin') {
                await User.findByIdAndUpdate(sellerId, { role: 'seller' });
            }

            return ApiResponse.success(res, 201, 'Shop created successfully', { shop });
        } catch (error) {
            next(error);
        }
    }

    static async getMyShop(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) {
                return ApiResponse.success(res, 200, 'No shop found', { shop: null });
            }
            return ApiResponse.success(res, 200, 'Shop details fetched', { shop });
        } catch (error) {
            next(error);
        }
    }

    static async updateShop(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOneAndUpdate(
                { sellerId: req.user?._id },
                req.body,
                { new: true, runValidators: true }
            );

            if (!shop) {
                throw new AppError('Shop not found', 404);
            }
            return ApiResponse.success(res, 200, 'Shop updated successfully', { shop });
        } catch (error) {
            next(error);
        }
    }
}
