import { Request, Response, NextFunction } from 'express';
import { CustomOrder } from '../models/customOrder.model';
import { Shop } from '../models/shop.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class CustomOrderController {
    // Buyer: Create custom request
    static async createRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const { shopId, description, budget, deadline, attachments } = req.body;
            const buyerId = req.user?._id;

            const shop = await Shop.findById(shopId);
            if (!shop) throw new AppError('Shop not found', 404);

            const request = await CustomOrder.create({
                buyerId,
                sellerId: shop._id,
                description,
                budget,
                deadline,
                attachments,
                status: 'pending'
            });

            return ApiResponse.success(res, 201, 'Custom request sent to artisan', { request });
        } catch (error) {
            next(error);
        }
    }

    // Seller: Provide quote for custom request
    static async provideQuote(req: Request, res: Response, next: NextFunction) {
        try {
            const { requestId, quotePrice } = req.body;
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) throw new AppError('Shop not found', 404);

            const request = await CustomOrder.findOneAndUpdate(
                { _id: requestId, sellerId: shop._id },
                { quotePrice, status: 'quoted' },
                { new: true }
            );

            if (!request) throw new AppError('Request not found', 404);

            return ApiResponse.success(res, 200, 'Quote sent to buyer', { request });
        } catch (error) {
            next(error);
        }
    }

    // Buyer: Accept quote
    static async acceptQuote(req: Request, res: Response, next: NextFunction) {
        try {
            const { requestId } = req.params;
            const request = await CustomOrder.findOneAndUpdate(
                { _id: requestId, buyerId: req.user?._id, status: 'quoted' },
                { status: 'accepted' },
                { new: true }
            );

            if (!request) throw new AppError('Valid quoted request not found', 404);

            // In real app, this would trigger order/payment generation
            return ApiResponse.success(res, 200, 'Quote accepted. Proceed to checkout placeholder.', { request });
        } catch (error) {
            next(error);
        }
    }

    // Get My Requests (Buyer)
    static async getMyRequests(req: Request, res: Response, next: NextFunction) {
        try {
            const requests = await CustomOrder.find({ buyerId: req.user?._id })
                .populate('sellerId', 'name slug logo')
                .sort('-createdAt');
            return ApiResponse.success(res, 200, 'My custom requests fetched', { requests });
        } catch (error) {
            next(error);
        }
    }

    // Get Shop Requests (Seller)
    static async getShopRequests(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) throw new AppError('Shop not found', 404);

            const requests = await CustomOrder.find({ sellerId: shop._id })
                .populate('buyerId', 'name email avatar')
                .sort('-createdAt');
            return ApiResponse.success(res, 200, 'Shop custom requests fetched', { requests });
        } catch (error) {
            next(error);
        }
    }
}
