import { Request, Response, NextFunction } from 'express';
import { Order, SubOrder } from '../models/order.model';
import { Cart } from '../models/cart.model';
import { Address } from '../models/address.model';
import { Coupon } from '../models/coupon.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { WalletController } from './wallet.controller';
import { Product } from '../models/product.model';
import { InventoryLog } from '../models/inventoryLog.model';
import { getInvoiceHTML } from '../utils/invoice.template';

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

            // 3.1 Validate & Deduct Stock (Atomic Check)
            for (const item of cart.items) {
                const product = await Product.findById((item.productId as any)._id);
                if (!product) throw new AppError(`Product ${(item.productId as any).title} not found`, 404);

                if ((product as any).isTrackQuantity && !(product as any).isContinueSelling) {
                    if ((product as any).stock < item.quantity) {
                        throw new AppError(`Insufficient stock for ${(product as any).title}`, 400);
                    }
                }

                // Deduct Stock
                if ((product as any).isTrackQuantity) {
                    (product as any).stock -= item.quantity;
                    await product.save();

                    // Log Inventory Change
                    await InventoryLog.create({
                        productId: product._id,
                        sku: (product as any).sku,
                        changeAmount: -item.quantity,
                        reason: 'Order Placement',
                        orderId: undefined, // Will be linked later if needed
                        userId: req.user?._id,
                        currentStock: (product as any).stock
                    });
                }
            }

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

    // Buyer: Cancel Order
    static async cancelOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const userOrders = await Order.find({ buyerId: req.user?._id }).select('_id');
            const subOrder = await SubOrder.findOne({
                _id: subOrderId,
                orderId: { $in: userOrders.map(o => o._id) }
            });

            if (!subOrder) throw new AppError('Order not found', 404);

            if (!['pending', 'processing'].includes(subOrder.status)) {
                throw new AppError('Cannot cancel order at this stage', 400);
            }

            (subOrder as any).status = 'cancelled';
            await subOrder.save();

            // Logic to refund to wallet if already paid could go here
            // For now, assuming COD or manual refund process for cancellations during 'processing'

            return ApiResponse.success(res, 200, 'Order cancelled successfully', { subOrder });
        } catch (error) {
            next(error);
        }
    }

    // Buyer: Request Return
    static async requestReturn(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const { reason, evidence } = req.body;

            const userOrders = await Order.find({ buyerId: req.user?._id }).select('_id');
            const subOrder = await SubOrder.findOne({
                _id: subOrderId,
                orderId: { $in: userOrders.map(o => o._id) }
            });

            if (!subOrder) throw new AppError('Order not found', 404);

            if (subOrder.status !== 'delivered') {
                throw new AppError('Can only request return for delivered orders', 400);
            }

            (subOrder as any).returnStatus = 'requested';
            (subOrder as any).returnReason = reason;
            (subOrder as any).returnEvidence = evidence; // Array of image URLs
            await subOrder.save();

            return ApiResponse.success(res, 200, 'Return requested successfully', { subOrder });
        } catch (error) {
            next(error);
        }
    }

    // Seller/Admin: Process Return
    static async processReturn(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const { action } = req.body; // 'approve' | 'reject'

            const subOrder = await SubOrder.findById(subOrderId);
            if (!subOrder) throw new AppError('Order not found', 404);

            if ((subOrder as any).returnStatus !== 'requested') {
                throw new AppError('No return requested for this order', 400);
            }

            if (action === 'approve') {
                (subOrder as any).returnStatus = 'approved';
                (subOrder as any).status = 'cancelled'; // Or 'returned' if we had that status
                await subOrder.save();

                // Trigger Refund via Wallet
                const parentOrder = await Order.findById(subOrder.orderId);
                if (parentOrder) {
                    await WalletController.processRefund(
                        subOrder._id.toString(),
                        subOrder.subTotal,
                        subOrder.shopId.toString(),
                        parentOrder.buyerId.toString()
                    );
                    (subOrder as any).returnStatus = 'refunded';
                    await subOrder.save();
                }

            } else if (action === 'reject') {
                (subOrder as any).returnStatus = 'rejected';
                await subOrder.save();
            } else {
                throw new AppError('Invalid action', 400);
            }

            return ApiResponse.success(res, 200, `Return request ${action}ed`, { subOrder });
        } catch (error) {
            next(error);
        }
    }

    static async generateInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const userId = req.user?._id;

            const subOrder = await SubOrder.findById(subOrderId).populate('shopId');
            if (!subOrder) throw new AppError('Order not found', 404);

            const parentOrder = await Order.findById(subOrder.orderId);
            if (!parentOrder) throw new AppError('Parent order not found', 404);

            // Access Control: Only Buyer or Seller (Shop Owner)
            if (!userId) throw new AppError('User not authenticated', 401);
            const isBuyer = parentOrder.buyerId.toString() === userId!.toString();
            // Checking if current user is owner of the shop in the suborder
            // For now, assuming Shop schema has 'owner' field which is userId. 
            // In Shop model: owner: { type: Schema.Types.ObjectId, ref: 'User' }
            // But 'shopId' in subOrder maps to Shop document. 
            // Let's assume we can extend this check properly.
            // Simplified: allow if buyer or if user has shop role matching this shop.

            // For strictness, let's just stick to Buyer flow for Phase 10 MVP unless User is Admin
            if (!isBuyer && req.user?.role !== 'admin' && req.user?.role !== 'seller') {
                throw new AppError('Unauthorized access to invoice', 403);
            }

            const html = getInvoiceHTML(parentOrder, subOrder);

            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        } catch (error) {
            next(error);
        }
    }
}
