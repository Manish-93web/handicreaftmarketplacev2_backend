import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/order.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { SubOrder } from '../models/order.model';
import { WalletController } from './wallet.controller';

export class PaymentController {

    private static razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_change_me',
        key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_change_me'
    });

    static async initiatePayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { orderId } = req.body;
            const order = await Order.findById(orderId);
            if (!order) throw new AppError('Order not found', 404);

            // Create Razorpay Order
            const options = {
                amount: Math.round(order.grandTotal * 100), // Amount in paise
                currency: "INR",
                receipt: `order_${orderId}`,
                payment_capture: 1
            };

            const razorpayOrder = await PaymentController.razorpay.orders.create(options);

            return ApiResponse.success(res, 200, 'Payment initiated', {
                key: process.env.RAZORPAY_KEY_ID,
                orderId: razorpayOrder.id, // Razorpay Order ID
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                dbOrderId: order._id // Our DB Order ID
            });
        } catch (error) {
            next(error);
        }
    }

    static async verifyPaymentWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = req.body;

            // authenticating valid payment
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'secret_change_me')
                .update(body.toString())
                .digest('hex');

            if (expectedSignature === razorpay_signature) {
                // Update Parent Order
                const order = await Order.findByIdAndUpdate(dbOrderId, {
                    paymentStatus: 'paid',
                    status: 'processing',
                    paymentDetails: {
                        transactionId: razorpay_payment_id,
                        orderId: razorpay_order_id,
                        method: 'razorpay'
                    }
                }, { new: true });

                if (!order) throw new AppError('Order not found', 404);

                // Fetch SubOrders and Credit Sellers
                const subOrders = await SubOrder.find({ orderId: order._id });

                for (const subOrder of subOrders) {
                    await SubOrder.findByIdAndUpdate(subOrder._id, { status: 'processing' }); // Update suborder status too

                    // Credit Seller Wallet (now that payment is confirmed)
                    await WalletController.handleOrderCredit(
                        subOrder._id.toString(),
                        subOrder.subTotal,
                        subOrder.shopId.toString()
                    );
                }

                return ApiResponse.success(res, 200, 'Payment verified and order processed');
            } else {
                throw new AppError('Invalid payment signature', 400);
            }
        } catch (error) {
            next(error);
        }
    }
}
