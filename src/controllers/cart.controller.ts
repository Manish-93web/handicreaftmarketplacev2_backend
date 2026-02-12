import { Request, Response, NextFunction } from 'express';
import { Cart } from '../models/cart.model';
import { SellerListing } from '../models/sellerListing.model';
import { BuyBoxService } from '../services/buybox.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class CartController {

    static async getCart(req: Request, res: Response, next: NextFunction) {
        try {
            let cart = await Cart.findOne({ userId: req.user?._id })
                .populate({
                    path: 'items.listingId',
                    populate: [
                        { path: 'productId', select: 'title slug images' },
                        { path: 'shopId', select: 'name slug' }
                    ]
                });

            if (!cart) {
                cart = await Cart.create({ userId: req.user?._id, items: [] });
            }

            return ApiResponse.success(res, 200, 'Cart fetched', { cart });
        } catch (error) {
            next(error);
        }
    }

    static async addToCart(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId, listingId, quantity = 1 } = req.body;

            let finalListingId = listingId;

            // If only productId is provided, find the Buy Box winner
            if (!finalListingId && productId) {
                const winner = await BuyBoxService.getBuyBoxWinner(productId);
                if (!winner) throw new AppError('No active listings found for this product', 404);
                finalListingId = winner._id;
            }

            if (!finalListingId) throw new AppError('Listing ID or Product ID required', 400);

            const listing = await SellerListing.findById(finalListingId);
            if (!listing) throw new AppError('Listing not found', 404);
            if (listing.stock < quantity) throw new AppError('Insufficient stock', 400);

            let cart = await Cart.findOne({ userId: req.user?._id });
            if (!cart) {
                cart = new Cart({ userId: req.user?._id, items: [] });
            }

            const itemIndex = cart.items.findIndex(p => p.listingId.toString() === finalListingId.toString());

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantity;
            } else {
                cart.items.push({
                    listingId: finalListingId,
                    quantity
                });
            }

            await (cart as any).save();
            return ApiResponse.success(res, 200, 'Item added to cart', { cart });
        } catch (error) {
            next(error);
        }
    }

    static async updateQuantity(req: Request, res: Response, next: NextFunction) {
        try {
            const { listingId, quantity } = req.body;
            const cart = await Cart.findOne({ userId: req.user?._id });
            if (!cart) throw new AppError('Cart not found', 404);

            const itemIndex = cart.items.findIndex(p => p.listingId.toString() === listingId);
            if (itemIndex === -1) throw new AppError('Item not in cart', 404);

            if (quantity <= 0) {
                cart.items.splice(itemIndex, 1);
            } else {
                // Check stock
                const listing = await SellerListing.findById(listingId);
                if (listing && listing.stock < quantity) throw new AppError('Insufficient stock', 400);

                cart.items[itemIndex].quantity = quantity;
            }

            await (cart as any).save();
            return ApiResponse.success(res, 200, 'Quantity updated', { cart });
        } catch (error) {
            next(error);
        }
    }

    static async removeFromCart(req: Request, res: Response, next: NextFunction) {
        try {
            const { listingId } = req.params;
            const cart = await Cart.findOne({ userId: req.user?._id });
            if (!cart) throw new AppError('Cart not found', 404);

            cart.items = cart.items.filter(p => p.listingId.toString() !== listingId);
            await (cart as any).save();

            return ApiResponse.success(res, 200, 'Item removed', { cart });
        } catch (error) {
            next(error);
        }
    }
}
