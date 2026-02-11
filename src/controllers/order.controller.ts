import { Request, Response, NextFunction } from 'express';
import { Order, SubOrder } from '../models/order.model';
import { Cart } from '../models/cart.model';
import { Address } from '../models/address.model';
import { Coupon } from '../models/coupon.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { WalletController } from './wallet.controller';

export class OrderController {

    static async placeOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { addressId, paymentMethod, couponCode } = req.body;

            // 1. Get Cart
            const cart = await Cart.findOne({ userId: req.user?._id })
                .populate('items.productId');
            if (!cart || cart.items.length === 0) {
                throw new AppError('Cart is empty', 400);
            }

            // 2. Get Address
            const address = await Address.findById(addressId);
            if (!address) throw new AppError('Address not found', 404);

            // 3. Calculate Totals
            let totalAmount = 0;
            const shopGroups: any = {};

            cart.items.forEach((item: any) => {
                const itemPrice = item.productId.price;
                const itemTotal = itemPrice * item.quantity;
                totalAmount += itemTotal;

                if (!shopGroups[item.shopId]) {
                    shopGroups[item.shopId] = { items: [], subTotal: 0 };
                }
                shopGroups[item.shopId].items.push({
                    productId: item.productId._id,
                    title: item.productId.title,
                    price: itemPrice,
                    quantity: item.quantity,
                    image: item.productId.images[0]
                });
                shopGroups[item.shopId].subTotal += itemTotal;
            });

            const taxAmount = Math.round(totalAmount * 0.12);
            let grandTotal = totalAmount + taxAmount;
            let couponDiscount = 0;

            // Phase 11: Coupon Logic
            if (couponCode) {
                const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
                if (coupon && new Date() <= coupon.expiryDate && totalAmount >= coupon.minOrderAmount) {
                    if (coupon.discountType === 'percentage') {
                        couponDiscount = (totalAmount * coupon.discountAmount) / 100;
                        if (coupon.maxDiscountAmount && couponDiscount > coupon.maxDiscountAmount) {
                            couponDiscount = coupon.maxDiscountAmount;
                        }
                    } else {
                        couponDiscount = coupon.discountAmount;
                    }

                    grandTotal -= couponDiscount;
                    coupon.usedCount += 1;
                    await (coupon as any).save();
                }
            }

            // 4. Create Parent Order
            const parentOrder = await Order.create({
                buyerId: req.user?._id,
                totalAmount,
                taxAmount,
                discountAmount: couponDiscount,
                grandTotal,
                paymentMethod,
                shippingAddress: address,
                paymentStatus: 'pending' // Usually 'paid' after gateway success
            });

            // 5. Create Sub Orders
            const subOrders = [];
            for (const shopId in shopGroups) {
                const subOrder = await SubOrder.create({
                    orderId: parentOrder._id,
                    shopId,
                    items: shopGroups[shopId].items,
                    subTotal: shopGroups[shopId].subTotal,
                    status: 'pending'
                });
                subOrders.push(subOrder);

                // Phase 8: Credit seller wallet (net of commission)
                await WalletController.handleOrderCredit(
                    subOrder._id.toString(),
                    shopGroups[shopId].subTotal,
                    shopId
                );
            }

            // 6. Clear Cart
            cart.items = [];
            await (cart as any).save();

            return ApiResponse.success(res, 201, 'Order placed successfully', {
                order: parentOrder,
                subOrders
            });
        } catch (error) {
            next(error);
        }
    }

    static async getMyOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const orders = await Order.find({ buyerId: req.user?._id }).sort('-createdAt');
            return ApiResponse.success(res, 200, 'Orders fetched', { orders });
        } catch (error) {
            next(error);
        }
    }

    static async getOrderById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const order = await Order.findById(id);
            if (!order) throw new AppError('Order not found', 404);

            // Fetch suborders for this parent order
            const subOrders = await SubOrder.find({ orderId: id }).populate('shopId', 'name slug');

            return ApiResponse.success(res, 200, 'Order details fetched', { order, subOrders });
        } catch (error) {
            next(error);
        }
    }

    static async getShopOrders(req: Request, res: Response, next: NextFunction) {
        try {
            // Identify shop of the seller
            const shopId = req.query.shopId as string;
            const orders = await SubOrder.find({ shopId }).sort('-createdAt');
            return ApiResponse.success(res, 200, 'Shop orders fetched', { orders });
        } catch (error) {
            next(error);
        }
    }

    static async updateSubOrderStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const { status } = req.body;

            const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

            const subOrder = await SubOrder.findByIdAndUpdate(
                subOrderId,
                { status },
                { new: true }
            );

            if (!subOrder) throw new AppError('Sub-order not found', 404);

            // Check if all sub-orders are delivered, update parent order status
            const allSubOrders = await SubOrder.find({ orderId: subOrder.orderId });
            const allDelivered = allSubOrders.every(so => so.status === 'delivered');
            if (allDelivered) {
                await Order.findByIdAndUpdate(subOrder.orderId, { status: 'delivered' });
            } else if (status === 'shipped') {
                await Order.findByIdAndUpdate(subOrder.orderId, { status: 'shipped' });
            }

            return ApiResponse.success(res, 200, `Order marked as ${status}`, { subOrder });
        } catch (error) {
            next(error);
        }
    }

    static async updateSubOrderTracking(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const { trackingNumber, carrier } = req.body;

            const subOrder = await SubOrder.findByIdAndUpdate(
                subOrderId,
                { trackingNumber, carrier, status: 'shipped' },
                { new: true }
            );

            if (!subOrder) throw new AppError('Sub-order not found', 404);

            // Also update parent order status to shipped if it was pending/processing
            await Order.findByIdAndUpdate(subOrder.orderId, { status: 'shipped' });

            return ApiResponse.success(res, 200, 'Tracking information updated', { subOrder });
        } catch (error) {
            next(error);
        }
    }
}
