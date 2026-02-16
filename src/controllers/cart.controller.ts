import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
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
                    populate: {
                        path: 'productId shopId',
                        select: 'title price images name slug logo isVerified performanceScore'
                    }
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

            if (productId && !mongoose.Types.ObjectId.isValid(productId as string)) {
                throw new AppError('Invalid Product ID format', 400);
            }
            if (listingId && !mongoose.Types.ObjectId.isValid(listingId as string)) {
                throw new AppError('Invalid Listing ID format', 400);
            }

            let finalListingId = listingId;

            // If only productId is provided, find the Buy Box winner
            if (!finalListingId && productId) {
                const winner = await BuyBoxService.getBuyBoxWinner(productId as string);
                if (!winner) throw new AppError(`No active listings found for product: ${productId}`, 404);
                finalListingId = winner._id;
            }

            if (!finalListingId) throw new AppError('Listing ID or Product ID required', 400);

            // Fetch the listing to ensure it exists and get correct price
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

            // Populate cart for the frontend
            const populatedCart = await Cart.findById(cart._id).populate({
                path: 'items.listingId',
                populate: {
                    path: 'productId shopId',
                    select: 'title price images name slug logo isVerified performanceScore'
                }
            });

            return ApiResponse.success(res, 200, 'Item added to cart', { cart: populatedCart });
        } catch (error) {
            next(error);
        }
    }

    static async updateQuantity(req: Request, res: Response, next: NextFunction) {
        try {
            const { listingId, quantity } = req.body;
            if (!mongoose.Types.ObjectId.isValid(listingId as string)) {
                throw new AppError('Invalid Listing ID format', 400);
            }
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
            if (!mongoose.Types.ObjectId.isValid(listingId as string)) {
                throw new AppError('Invalid Listing ID format', 400);
            }
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
