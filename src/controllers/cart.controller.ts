import { Request, Response, NextFunction } from 'express';
import Cart from '../models/cart.model';
import Product from '../models/product.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class CartController {

    static async getCart(req: Request, res: Response, next: NextFunction) {
        try {
            let cart = await Cart.findOne({ userId: req.user?._id })
                .populate('items.productId', 'title slug price images stock')
                .populate('items.shopId', 'name slug');

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
            const { productId, quantity = 1 } = req.body;
            const product = await Product.findById(productId);
            if (!product) throw new AppError('Product not found', 404);

            let cart = await Cart.findOne({ userId: req.user?._id });
            if (!cart) {
                cart = new Cart({ userId: req.user?._id, items: [] });
            }

            const itemIndex = cart.items.findIndex(p => p.productId.toString() === productId);

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantity;
            } else {
                cart.items.push({
                    productId,
                    quantity,
                    shopId: product.shopId
                });
            }

            await cart.save();
            return ApiResponse.success(res, 200, 'Item added to cart', { cart });
        } catch (error) {
            next(error);
        }
    }

    static async updateQuantity(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId, quantity } = req.body;
            const cart = await Cart.findOne({ userId: req.user?._id });
            if (!cart) throw new AppError('Cart not found', 404);

            const itemIndex = cart.items.findIndex(p => p.productId.toString() === productId);
            if (itemIndex === -1) throw new AppError('Item not in cart', 404);

            if (quantity <= 0) {
                cart.items.splice(itemIndex, 1);
            } else {
                cart.items[itemIndex].quantity = quantity;
            }

            await cart.save();
            return ApiResponse.success(res, 200, 'Quantity updated', { cart });
        } catch (error) {
            next(error);
        }
    }

    static async removeFromCart(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const cart = await Cart.findOne({ userId: req.user?._id });
            if (!cart) throw new AppError('Cart not found', 404);

            cart.items = cart.items.filter(p => p.productId.toString() !== productId);
            await cart.save();

            return ApiResponse.success(res, 200, 'Item removed', { cart });
        } catch (error) {
            next(error);
        }
    }
}
