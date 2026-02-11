import { Request, Response, NextFunction } from 'express';
import { Wallet, Transaction } from '../models/wallet.model';
import { ApiResponse } from '../utils/ApiResponse';

export class WalletController {

    static async getMyWallet(req: Request, res: Response, next: NextFunction) {
        try {
            let wallet = await Wallet.findOne({ userId: req.user?._id });
            if (!wallet) {
                wallet = await Wallet.create({ userId: req.user?._id });
            }

            const transactions = await Transaction.find({ walletId: wallet._id })
                .sort('-createdAt')
                .limit(20);

            return ApiResponse.success(res, 200, 'Wallet details fetched', {
                wallet,
                transactions
            });
        } catch (error) {
            next(error);
        }
    }

    // Internal method to handle order commission and credits
    static async handleOrderCredit(subOrderId: string, amount: number, sellerId: string) {
        // 1. Calculate commission (e.g., 10%)
        const commission = amount * 0.10;
        const netAmount = amount - commission;

        let wallet = await Wallet.findOne({ userId: sellerId });
        if (!wallet) wallet = await Wallet.create({ userId: sellerId });

        // 2. Add to pending balance (will be moved to balance after delivery/return period)
        wallet.pendingBalance += netAmount;
        await (wallet as any).save();

        // 3. Record transaction
        await Transaction.create({
            walletId: wallet._id,
            amount: netAmount,
            type: 'credit',
            status: 'pending',
            description: `Credit for order ${subOrderId} (Net of 10% commission)`,
            subOrderId
        });
    }
}
