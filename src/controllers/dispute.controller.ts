import { Request, Response, NextFunction } from 'express';
import { Dispute } from '../models/dispute.model';
import { SubOrder } from '../models/order.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { WalletController } from './wallet.controller';

export class DisputeController {

    static async openDispute(req: Request, res: Response, next: NextFunction) {
        try {
            const { subOrderId, reason, description, evidence } = req.body;
            const buyerId = req.user?._id;

            const subOrder = await SubOrder.findById(subOrderId).populate('shopId');
            if (!subOrder) throw new AppError('Order not found', 404);

            // Check if dispute already exists
            const existing = await Dispute.findOne({ subOrderId });
            if (existing) throw new AppError('Dispute already exists for this order', 400);

            const dispute = await Dispute.create({
                subOrderId,
                buyerId,
                sellerId: (subOrder.shopId as any).sellerId,
                reason,
                description,
                evidence,
                status: 'opened'
            });

            return ApiResponse.success(res, 201, 'Dispute opened successfully', { dispute });
        } catch (error) {
            next(error);
        }
    }

    static async getMyDisputes(req: Request, res: Response, next: NextFunction) {
        try {
            const filter = req.user?.role === 'seller'
                ? { sellerId: req.user._id }
                : { buyerId: req.user?._id };

            const disputes = await Dispute.find(filter)
                .populate('subOrderId')
                .sort('-createdAt');

            return ApiResponse.success(res, 200, 'Disputes fetched', { disputes });
        } catch (error) {
            next(error);
        }
    }

    static async getDisputeById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const dispute = await Dispute.findById(id).populate('subOrderId');
            if (!dispute) throw new AppError('Dispute not found', 404);

            return ApiResponse.success(res, 200, 'Dispute details fetched', { dispute });
        } catch (error) {
            next(error);
        }
    }

    static async resolveDispute(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { resolution, adminNote } = req.body; // resolution: 'refund_issued' | 'funds_released'

            const dispute = await Dispute.findById(id);
            if (!dispute) throw new AppError('Dispute not found', 404);

            if (dispute.status === 'resolved') throw new AppError('Dispute already resolved', 400);

            const subOrder = await SubOrder.findById(dispute.subOrderId).populate('orderId');
            if (!subOrder) throw new AppError('Sub-order not found', 404);

            if (resolution === 'refund_issued') {
                // Trigger refund
                await WalletController.refundToBuyerWallet(
                    subOrder._id.toString(),
                    subOrder.subTotal,
                    dispute.buyerId.toString(),
                    dispute.sellerId.toString(),
                    `Dispute Resolved: ${adminNote || 'Refund issued'}`
                );
                subOrder.status = 'cancelled';
                await subOrder.save();
            } else if (resolution === 'funds_released') {
                // If funds were in pending, we'd release them. 
                // For now, let's assume 'funds_released' means admin closes dispute and seller keeps money.
                // We'll mark the sub-order as delivered to trigger any final settlement logic.
                if (subOrder.status !== 'delivered') {
                    subOrder.status = 'delivered';
                    await subOrder.save();
                }
            }

            dispute.status = 'resolved';
            dispute.resolution = resolution;
            dispute.adminNote = adminNote;
            await dispute.save();

            return ApiResponse.success(res, 200, 'Dispute resolved', { dispute });
        } catch (error) {
            next(error);
        }
    }

    static async getAllDisputes(req: Request, res: Response, next: NextFunction) {
        try {
            const disputes = await Dispute.find()
                .populate('buyerId', 'name email')
                .populate('sellerId', 'name email')
                .sort('-createdAt');
            return ApiResponse.success(res, 200, 'All disputes fetched', { disputes });
        } catch (error) {
            next(error);
        }
    }
}
