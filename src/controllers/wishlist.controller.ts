import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Wishlist } from '../models/wishlist.model';
import { SellerListing } from '../models/sellerListing.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { BuyBoxService } from '../services/buybox.service';

export class WishlistController {
    private static async getPopulated(userId: any) {
        return await Wishlist.findOne({ userId }).populate({
            path: 'items.listingId',
            populate: {
                path: 'productId shopId',
                select: 'title price images description name slug logo isVerified performanceScore'
            }
        });
    }

    static async getWishlist(req: Request, res: Response, next: NextFunction) {
        try {
            let wishlist = await WishlistController.getPopulated(req.user?._id);

            if (!wishlist) {
                wishlist = await Wishlist.create({ userId: req.user?._id, items: [] });
            }

            return ApiResponse.success(res, 200, 'Wishlist fetched', { wishlist });
        } catch (error) {
            next(error);
        }
    }

    static async addToWishlist(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId, listingId } = req.body;
            console.log(`[Wishlist] addToWishlist request: productId=${productId}, listingId=${listingId}`);

            if (productId && !mongoose.Types.ObjectId.isValid(productId as string)) {
                throw new AppError('Invalid Product ID format', 400);
            }
            if (listingId && !mongoose.Types.ObjectId.isValid(listingId as string)) {
                throw new AppError('Invalid Listing ID format', 400);
            }

            let finalListingId = listingId;

            // If only productId is provided, find the Buy Box winner
            if (!finalListingId && productId) {
                console.log(`[Wishlist] Resolving Buy Box for product: ${productId}`);
                const winner = await BuyBoxService.getBuyBoxWinner(productId as string);
                if (!winner) {
                    console.error(`[Wishlist] No Buy Box winner found for product: ${productId}`);
                    throw new AppError(`No active listings found for product: ${productId}`, 404);
                }
                finalListingId = winner._id;
                console.log(`[Wishlist] Resolved listing ID: ${finalListingId}`);
            }

            if (!finalListingId) throw new AppError('Listing ID or Product ID required', 400);

            const listing = await SellerListing.findById(finalListingId);
            if (!listing) throw new AppError('Listing not found', 404);

            let wishlist = await Wishlist.findOne({ userId: req.user?._id });
            if (!wishlist) {
                wishlist = new Wishlist({ userId: req.user?._id, items: [] });
            }

            const exists = wishlist.items.some(item => item.listingId.toString() === finalListingId.toString());
            if (exists) {
                console.log('[Wishlist] Item already exists');
                return ApiResponse.success(res, 200, 'Item already in wishlist', { wishlist });
            }

            wishlist.items.push({ listingId: finalListingId, addedAt: new Date() });
            await wishlist.save();
            console.log('[Wishlist] Item added successfully');

            const populatedWishlist = await WishlistController.getPopulated(req.user?._id);
            return ApiResponse.success(res, 201, 'Item added to wishlist', { wishlist: populatedWishlist });
        } catch (error) {
            next(error);
        }
    }

    static async removeFromWishlist(req: Request, res: Response, next: NextFunction) {
        try {
            const { listingId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(listingId as string)) {
                throw new AppError('Invalid Listing ID format', 400);
            }

            const wishlist = await Wishlist.findOne({ userId: req.user?._id });
            if (!wishlist) throw new AppError('Wishlist not found', 404);

            wishlist.items = wishlist.items.filter(item => item.listingId.toString() !== listingId);
            await wishlist.save();

            const populatedWishlist = await WishlistController.getPopulated(req.user?._id);
            return ApiResponse.success(res, 200, 'Item removed from wishlist', { wishlist: populatedWishlist });
        } catch (error) {
            next(error);
        }
    }
}
