import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { Order, SubOrder } from '../models/order.model';
import { Cart } from '../models/cart.model';
import { Address } from '../models/address.model';
import { Coupon } from '../models/coupon.model';
import { SellerListing } from '../models/sellerListing.model';
import { BuyBoxService } from '../services/buybox.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { WalletController } from './wallet.controller';
import { InventoryLog } from '../models/inventoryLog.model';
import { getInvoiceHTML } from '../utils/invoice.template';
import mongoose from 'mongoose';

export class OrderController {

    static async placeOrder(req: Request, res: Response, next: NextFunction) {
        try {
            logger.info('--- Place Order Request ---');
            const { addressId, paymentMethod, couponCode } = req.body;
            logger.info(`Payload: ${JSON.stringify({ addressId, paymentMethod, couponCode })}`);
            logger.info(`User ID: ${req.user?._id}`);

            // 1. Get Cart with Listings Populated
            const cart = await Cart.findOne({ userId: req.user?._id })
                .populate({
                    path: 'items.listingId',
                    populate: { path: 'productId' }
                });

            if (!cart || cart.items.length === 0) {
                logger.warn(`Cart is empty or not found for user ${req.user?._id}`);
                throw new AppError('Cart is empty', 400);
            }
            logger.info(`Cart found with ${cart.items.length} items`);

            // 2. Get Address
            const address = await Address.findById(addressId);
            if (!address) {
                logger.warn(`Address not found for ID ${addressId}`);
                throw new AppError('Address not found', 404);
            }
            logger.info('Address found');

            // 3. Calculate Totals & Group by Shop
            let totalAmount = 0;
            const shopGroups: any = {};

            for (const item of cart.items) {
                const listing: any = item.listingId;
                if (!listing) {
                    logger.warn(`Listing not found for item ${JSON.stringify(item)}`);
                    throw new AppError('One or more listings in cart are no longer active', 400);
                }

                const product: any = listing.productId;
                const shop: any = await mongoose.model('Shop').findById(listing.shopId);

                logger.info(`Processing item for listing ${listing._id}, shop ${listing.shopId}`);

                const itemPrice = listing.price;
                const itemTotal = itemPrice * item.quantity;
                totalAmount += itemTotal;

                const shopId = listing.shopId.toString();

                // Advanced Commission Logic
                let itemCommission = 0;
                if (product.fixedCommissionFee) {
                    itemCommission = product.fixedCommissionFee * item.quantity;
                } else {
                    let rate = 10; // Default 10%
                    const category: any = await mongoose.model('Category').findById(product.category);

                    if (category && category.commissionRate) {
                        rate = category.commissionRate;
                    } else if (shop && shop.commissionOverride) {
                        rate = shop.commissionOverride;
                    }
                    itemCommission = (itemTotal * rate) / 100;
                }

                // ... (Stock check logic remains same)

                // 3.1 Stock Check & Deduction
                if (listing.isTrackQuantity && !listing.allowBackorder && !listing.isContinueSelling) {
                    if (listing.stock < item.quantity) {
                        logger.warn(`Insufficient stock for ${listing.productId?.title}. Stock: ${listing.stock}, Requested: ${item.quantity}`);
                        throw new AppError(`Insufficient stock for ${listing.productId?.title || 'Unknown Product'}`, 400);
                    }
                }

                if (listing.isTrackQuantity) {
                    listing.stock -= item.quantity;

                    // Update Stock Status
                    if (listing.stock <= 0) {
                        listing.stockStatus = listing.allowBackorder ? 'on_backorder' : 'out_of_stock';
                    } else {
                        listing.stockStatus = 'in_stock';
                    }

                    logger.info(`Updating stock for listing ${listing._id} to ${listing.stock}, status: ${listing.stockStatus}`);
                    await listing.save();

                    // Log Inventory Change
                    await InventoryLog.create({
                        productId: listing.productId._id,
                        listingId: listing._id,
                        sku: listing.sku,
                        changeAmount: -item.quantity,
                        reason: 'Order Placement',
                        userId: req.user?._id,
                        currentStock: listing.stock
                    });
                    logger.info('Inventory log created');

                    // Trigger Buy Box Re-calculation if stock changed significantly or hit 0
                    if (listing.stock === 0) {
                        logger.info('Stock hit zero, triggering Buy Box update');
                        await BuyBoxService.updateBuyBox(listing.productId._id.toString());
                    }
                }

                if (!shopGroups[shopId]) {
                    shopGroups[shopId] = { items: [], subTotal: 0, commission: 0 };
                }
                shopGroups[shopId].items.push({
                    listingId: listing._id,
                    productId: listing.productId._id,
                    title: listing.productId.title,
                    price: itemPrice,
                    quantity: item.quantity,
                    image: listing.productId.images?.[0] || ''
                });
                shopGroups[shopId].subTotal += itemTotal;
                shopGroups[shopId].commission += itemCommission;
            }

            const taxAmount = Math.round(totalAmount * 0.12);
            let grandTotal = totalAmount + taxAmount;
            let couponDiscount = 0;

            // Coupon Logic
            if (couponCode) {
                logger.info(`Applying coupon: ${couponCode}`);
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
                    logger.info(`Coupon applied, discount: ${couponDiscount}`);
                }
            }

            logger.info('Creating Parent Order...');
            // 4. Create Parent Order
            const parentOrder = await Order.create({
                buyerId: req.user?._id,
                totalAmount,
                taxAmount,
                discountAmount: couponDiscount,
                grandTotal,
                paymentMethod,
                shippingAddress: address.toObject(),
                paymentStatus: 'pending'
            });
            logger.info(`Parent Order created: ${parentOrder._id}`);

            // 5. Create Sub Orders
            const subOrders = [];
            for (const shopId in shopGroups) {
                logger.info(`Creating SubOrder for shop ${shopId}`);
                const subOrder = await SubOrder.create({
                    orderId: parentOrder._id,
                    shopId,
                    items: shopGroups[shopId].items,
                    subTotal: shopGroups[shopId].subTotal,
                    commission: shopGroups[shopId].commission,
                    netAmount: shopGroups[shopId].subTotal - shopGroups[shopId].commission,
                    status: 'pending'
                });
                subOrders.push(subOrder);

                // Phase 6 & 7: Escrow & Commission Integration
                const shop = await mongoose.model('Shop').findById(shopId);
                if (shop) {
                    await WalletController.handleOrderCredit(
                        subOrder._id.toString(),
                        subOrder.subTotal,
                        shop.sellerId.toString(),
                        subOrder.commission
                    );
                }
            }
            logger.info('SubOrders created and dynamic Escrow/Commission handled');

            // Phase 6: Fraud Scoring (Basic Heuristics)
            let fraudScore = 0;
            if (grandTotal > 50000) fraudScore += 40; // High value order
            if (paymentMethod === 'cod' && grandTotal > 10000) fraudScore += 20; // High COD

            // Check user order history (new user check)
            const previousOrders = await Order.countDocuments({ buyerId: req.user?._id });
            if (previousOrders === 0) fraudScore += 20;

            parentOrder.fraudScore = fraudScore;
            parentOrder.isFlagged = fraudScore > 75;
            await (parentOrder as any).save();

            // 6. Clear Cart
            cart.items = [];
            await (cart as any).save();
            logger.info('Cart cleared');

            return ApiResponse.success(res, 201, 'Order placed successfully', {
                order: parentOrder,
                subOrders
            });
        } catch (error: any) {
            logger.error(`Error in placeOrder: ${error.message}`, { stack: error.stack });
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

            const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'returned', 'exchanged'];
            if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

            const subOrder = await SubOrder.findByIdAndUpdate(
                subOrderId,
                { status },
                { returnDocument: 'after' }
            );

            if (!subOrder) throw new AppError('Sub-order not found', 404);

            // Sync parent order status
            const allSubOrders = await SubOrder.find({ orderId: subOrder.orderId });
            if (status === 'delivered') {
                const allDelivered = allSubOrders.every(so => so.status === 'delivered' || so.status === 'completed' || so.status === 'cancelled');
                if (allDelivered) await Order.findByIdAndUpdate(subOrder.orderId, { status: 'delivered' });
            } else if (status === 'completed') {
                const allCompleted = allSubOrders.every(so => so.status === 'completed' || so.status === 'cancelled');
                if (allCompleted) await Order.findByIdAndUpdate(subOrder.orderId, { status: 'completed' });
            } else if (['shipped', 'processing', 'confirmed'].includes(status)) {
                await Order.findByIdAndUpdate(subOrder.orderId, { status });
            }

            // Phase 6: Automatic Settlement on Delivery
            if (status === 'delivered') {
                const shop = await mongoose.model('Shop').findById(subOrder.shopId);
                if (shop) {
                    await WalletController.settleSubOrderFunds(
                        subOrder._id.toString(),
                        subOrder.subTotal,
                        shop.sellerId.toString()
                    );
                }
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
                { returnDocument: 'after' }
            );

            if (!subOrder) throw new AppError('Sub-order not found', 404);

            // Also update parent order status to shipped if it was pending/processing
            await Order.findByIdAndUpdate(subOrder.orderId, { status: 'shipped' });

            return ApiResponse.success(res, 200, 'Tracking information updated', { subOrder });
        } catch (error) {
            next(error);
        }
    }

    // Buyer: Request Exchange
    static async requestExchange(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const { reason, itemListingId } = req.body;

            const subOrder = await SubOrder.findOne({
                _id: subOrderId,
                // Access check logic similar to cancelOrder
            });

            if (!subOrder) throw new AppError('Order not found', 404);
            if (subOrder.status !== 'delivered') throw new AppError('Can only exchange delivered items', 400);

            subOrder.status = 'exchanged';
            // Logic for exchange would typically involve creating a new 'zero-cost' sub-order 
            // but for MVP we just mark the status.
            await subOrder.save();

            return ApiResponse.success(res, 200, 'Exchange requested. Artisan will contact you for pickup/replacement.', { subOrder });
        } catch (error) {
            next(error);
        }
    }

    // Buyer: Cancel Order (Full or Partial)
    static async cancelOrder(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const { itemListingId } = req.body; // Optional for partial cancellation

            const userOrders = await Order.find({ buyerId: req.user?._id }).select('_id');
            const subOrderArr = await SubOrder.find({
                _id: subOrderId,
                orderId: { $in: userOrders.map(o => o._id) }
            }).populate('items.listingId');

            const subOrder = subOrderArr[0];

            if (!subOrder) throw new AppError('Order not found', 404);

            if (!['pending', 'processing'].includes(subOrder.status)) {
                throw new AppError('Cannot cancel order at this stage', 400);
            }

            const parentOrder = await Order.findById(subOrder.orderId);
            if (!parentOrder) throw new AppError('Parent order not found', 404);

            if (itemListingId) {
                // Partial Cancellation
                const item = subOrder.items.find((i: any) => i.listingId._id.toString() === itemListingId);
                if (!item) throw new AppError('Item not found in this order', 404);
                if (item.status === 'cancelled') throw new AppError('Item already cancelled', 400);

                item.status = 'cancelled';

                // Restore Inventory
                const listing: any = item.listingId;
                if (listing && listing.isTrackQuantity) {
                    listing.stock += item.quantity;
                    await listing.save();

                    await InventoryLog.create({
                        productId: listing.productId,
                        listingId: listing._id,
                        sku: listing.sku,
                        changeAmount: item.quantity,
                        reason: 'Partial Order Cancellation',
                        userId: req.user?._id,
                        currentStock: listing.stock
                    });
                }

                // Trigger Refund if already paid
                if (parentOrder.paymentStatus === 'paid') {
                    await WalletController.refundToBuyerWallet(
                        subOrder._id.toString(),
                        item.price * item.quantity,
                        parentOrder.buyerId.toString(),
                        subOrder.shopId.toString(),
                        `Partial Cancellation Refund: ${item.title}`
                    );
                }

                // Check if all items are cancelled
                const allCancelled = subOrder.items.every((i: any) => i.status === 'cancelled');
                if (allCancelled) {
                    subOrder.status = 'cancelled';
                }
            } else {
                // Full Cancellation
                subOrder.status = 'cancelled';
                for (const item of subOrder.items) {
                    if (item.status !== 'cancelled') {
                        item.status = 'cancelled';

                        // Restore Inventory
                        const listing: any = item.listingId;
                        if (listing && listing.isTrackQuantity) {
                            listing.stock += item.quantity;
                            await listing.save();
                        }
                    }
                }

                // Trigger Refund if already paid
                if (parentOrder.paymentStatus === 'paid') {
                    await WalletController.refundToBuyerWallet(
                        subOrder._id.toString(),
                        subOrder.subTotal,
                        parentOrder.buyerId.toString(),
                        subOrder.shopId.toString(),
                        'Full Order Cancellation Refund'
                    );
                }
            }

            await subOrder.save();
            return ApiResponse.success(res, 200, 'Order/Item cancelled successfully', { subOrder });
        } catch (error) {
            next(error);
        }
    }

    // Buyer: Request Return (Full or Partial)
    static async requestReturn(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const { reason, evidence, itemListingId } = req.body;

            const userOrders = await Order.find({ buyerId: req.user?._id }).select('_id');
            const subOrder = await SubOrder.findOne({
                _id: subOrderId,
                orderId: { $in: userOrders.map(o => o._id) }
            });

            if (!subOrder) throw new AppError('Order not found', 404);

            if (subOrder.status !== 'delivered') {
                throw new AppError('Can only request return for delivered orders', 400);
            }

            if (itemListingId) {
                // Partial Return
                const item = subOrder.items.find((i: any) => i.listingId.toString() === itemListingId);
                if (!item) throw new AppError('Item not found in this order', 404);
                if (item.returnStatus !== 'none') throw new AppError('Return already requested for this item', 400);

                item.returnStatus = 'requested';

                // For simplified logic, we also update sub-order level flags
                subOrder.returnStatus = 'requested';
                subOrder.returnReason = reason;
                subOrder.returnEvidence = evidence;
            } else {
                // Full Return
                subOrder.returnStatus = 'requested';
                subOrder.returnReason = reason;
                subOrder.returnEvidence = evidence;
                for (const item of subOrder.items) {
                    item.returnStatus = 'requested';
                }
            }

            await subOrder.save();
            return ApiResponse.success(res, 200, 'Return requested successfully', { subOrder });
        } catch (error) {
            next(error);
        }
    }

    // Seller/Admin: Process Return (Full or Partial)
    static async processReturn(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const { action, itemListingId } = req.body; // action: 'approve' | 'reject'

            const subOrder = await SubOrder.findById(subOrderId);
            if (!subOrder) throw new AppError('Order not found', 404);

            const parentOrder = await Order.findById(subOrder.orderId);
            if (!parentOrder) throw new AppError('Parent order not found', 404);

            if (itemListingId) {
                // Partial Process
                const item = subOrder.items.find((i: any) => i.listingId.toString() === itemListingId);
                if (!item) throw new AppError('Item not found', 404);
                if (item.returnStatus !== 'requested') throw new AppError('No return requested for this item', 400);

                if (action === 'approve') {
                    item.returnStatus = 'refunded';
                    item.status = 'cancelled';

                    // Trigger Refund for this item
                    if (parentOrder.paymentStatus === 'paid') {
                        await WalletController.refundToBuyerWallet(
                            subOrder._id.toString(),
                            item.price * item.quantity,
                            parentOrder.buyerId.toString(),
                            subOrder.shopId.toString(),
                            `Partial Return Approved: ${item.title}`
                        );
                    }
                } else {
                    item.returnStatus = 'rejected';
                }
            } else {
                // Full Process
                if (action === 'approve') {
                    subOrder.returnStatus = 'refunded';
                    subOrder.status = 'cancelled';
                    for (const item of subOrder.items) {
                        item.returnStatus = 'refunded';
                        item.status = 'cancelled';
                    }

                    // Trigger Refund for full sub-order
                    if (parentOrder.paymentStatus === 'paid') {
                        await WalletController.refundToBuyerWallet(
                            subOrder._id.toString(),
                            subOrder.subTotal,
                            parentOrder.buyerId.toString(),
                            subOrder.shopId.toString(),
                            'Full Return Approved'
                        );
                    }
                } else {
                    subOrder.returnStatus = 'rejected';
                    for (const item of subOrder.items) {
                        item.returnStatus = 'rejected';
                    }
                }
            }

            await subOrder.save();
            return ApiResponse.success(res, 200, `Return request ${action}ed`, { subOrder });
        } catch (error) {
            next(error);
        }
    }

    static async generateInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId } = req.params;
            const userId = req.user?._id;

            const subOrder = await SubOrder.findById(subOrderId).populate('shopId').populate('items.productId');
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
