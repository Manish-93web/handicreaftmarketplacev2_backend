import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/order.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class PaymentController {

    static async initiatePayment(req: Request, res: Response, next: NextFunction) {
        try {
            const { orderId } = req.body;
            const order = await Order.findById(orderId);
            if (!order) throw new AppError('Order not found', 404);

            // Simulation: In a real app, we'd call Stripe/Razorpay and return a client secret
            return ApiResponse.success(res, 200, 'Payment initiated', {
                sessionUrl: `https://mock-payment-gateway.com/pay/${orderId}`,
                orderId
            });
        } catch (error) {
            next(error);
        }
    }

    static async verifyPaymentWebhook(req: Request, res: Response, next: NextFunction) {
        try {
            const { orderId, status } = req.body; // Simulated payload

            if (status === 'success') {
                await Order.findByIdAndUpdate(orderId, {
                    paymentStatus: 'paid',
                    status: 'processing'
                });
                return ApiResponse.success(res, 200, 'Order paid successfully');
            }

            return ApiResponse.success(res, 200, 'Webhook received');
        } catch (error) {
            next(error);
        }
    }
}
