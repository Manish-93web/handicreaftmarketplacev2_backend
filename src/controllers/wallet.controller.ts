import { Request, Response, NextFunction } from 'express';
import { Wallet, Transaction } from '../models/wallet.model';
import { PayoutRequest } from '../models/payoutRequest.model';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';
import { User } from '../models/user.model';
import mongoose from 'mongoose';

export class WalletController {

    static async getMyWallet(req: Request, res: Response, next: NextFunction) {
        try {
            const wallet = await Wallet.findOneAndUpdate(
                { userId: req.user?._id },
                { $setOnInsert: { userId: req.user?._id } },
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );

            const transactions = await Transaction.find({ walletId: wallet!._id })
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
    static async handleOrderCredit(subOrderId: string, amount: number, sellerId: string, commission: number) {
        const netAmount = amount - commission;

        const wallet = await Wallet.findOneAndUpdate(
            { userId: sellerId },
            { $setOnInsert: { userId: sellerId } },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        // 2. Add to pending balance (Locked in Escrow)
        wallet.pendingBalance += netAmount;
        await (wallet as any).save();

        // 3. Record transaction for Seller
        await Transaction.create({
            walletId: wallet._id,
            amount: netAmount,
            type: 'credit',
            status: 'pending',
            description: `Credit for sub-order ${subOrderId} (Net of ₹${commission.toLocaleString()} commission)`,
            subOrderId
        });

        // 4. Credit Admin Wallet for Commission
        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
            const adminWallet = await Wallet.findOneAndUpdate(
                { userId: admin._id },
                { $setOnInsert: { userId: admin._id } },
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );
            if (adminWallet) {
                adminWallet.balance += commission;
                await adminWallet.save();

                await Transaction.create({
                    walletId: adminWallet._id,
                    amount: commission,
                    type: 'credit',
                    status: 'completed',
                    description: `Commission from sub-order ${subOrderId}`,
                    subOrderId
                });
            }
        }
    }

    static async refundToBuyerWallet(subOrderId: string, amount: number, buyerId: string, sellerId: string, reason: string) {
        const buyerWallet = await Wallet.findOneAndUpdate(
            { userId: buyerId },
            { $setOnInsert: { userId: buyerId } },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        buyerWallet.balance += amount;
        await (buyerWallet as any).save();

        await Transaction.create({
            walletId: buyerWallet._id,
            amount: amount,
            type: 'credit',
            status: 'completed',
            description: `Refund for order ${subOrderId}: ${reason}`,
            subOrderId
        });

        let sellerWallet = await Wallet.findOne({ userId: sellerId });
        if (sellerWallet) {
            const commission = amount * 0.10;
            const netAmount = amount - commission;
            if (sellerWallet.pendingBalance >= netAmount) {
                sellerWallet.pendingBalance -= netAmount;
                await (sellerWallet as any).save();
                await Transaction.create({
                    walletId: sellerWallet._id,
                    amount: netAmount,
                    type: 'debit',
                    status: 'completed',
                    description: `Reversal for refund in order ${subOrderId}`,
                    subOrderId
                });
            }
        }
    }

    static async settleSubOrderFunds(subOrderId: string, amount: number, sellerId: string) {
        const wallet = await Wallet.findOne({ userId: sellerId });
        if (wallet && wallet.pendingBalance >= amount) {
            wallet.pendingBalance -= amount;
            wallet.balance += amount;
            await (wallet as any).save();

            // Update transaction status
            await Transaction.findOneAndUpdate(
                { subOrderId, walletId: wallet._id, type: 'credit', status: 'pending' },
                { status: 'completed', description: `Settled funds for order ${subOrderId}` }
            );
        }
    }

    // Seller: Request Payout
    static async requestPayout(req: Request, res: Response, next: NextFunction) {
        try {
            const { amount } = req.body;
            const sellerId = req.user?._id;

            const wallet = await Wallet.findOne({ userId: sellerId });
            if (!wallet) throw new AppError('Wallet not found', 404);

            if (wallet.balance < amount) {
                throw new AppError('Insufficient funds', 400);
            }

            if (amount < 1000) {
                throw new AppError('Minimum payout amount is ₹1,000', 400);
            }

            // Lock funds by deducting immediately
            wallet.balance -= amount;
            await wallet.save();

            const payout = await PayoutRequest.create({
                sellerId,
                amount
            });

            await Transaction.create({
                walletId: wallet._id,
                amount,
                type: 'debit',
                status: 'pending',
                description: `Payout Request #${payout._id}`
            });

            return ApiResponse.success(res, 201, 'Payout requested', { payout });
        } catch (error) {
            next(error);
        }
    }

    // Admin: Get All Payout Requests
    static async getAllPayouts(req: Request, res: Response, next: NextFunction) {
        try {
            const payouts = await PayoutRequest.find().populate('sellerId', 'name email').sort('-createdAt');
            return ApiResponse.success(res, 200, 'All payouts fetched', { payouts });
        } catch (error) {
            next(error);
        }
    }

    // Seller: Get My Payouts
    static async getMyPayouts(req: Request, res: Response, next: NextFunction) {
        try {
            const payouts = await PayoutRequest.find({ sellerId: req.user?._id }).sort('-createdAt');
            return ApiResponse.success(res, 200, 'My payouts fetched', { payouts });
        } catch (error) {
            next(error);
        }
    }

    // Admin: Approve/Reject Payout
    static async updatePayoutStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status, adminNote, transactionId } = req.body; // status: 'approved' | 'rejected'

            const payout = await PayoutRequest.findById(id);
            if (!payout) throw new AppError('Payout request not found', 404);

            if (payout.status !== 'pending') {
                throw new AppError('Request already processed', 400);
            }

            payout.status = status;
            payout.adminNote = adminNote;
            if (transactionId) payout.transactionId = transactionId;
            await payout.save();

            const wallet = await Wallet.findOne({ userId: payout.sellerId });
            if (!wallet) throw new AppError('Wallet not found for seller', 404);

            // Update Transaction status
            // We need to find the specific pending transaction for this payout. 
            // In a real app we'd link transactionId in PayoutRequest to Transaction model.
            // For now, let's find the latest pending debit of this amount or just log a new one for rejection?
            // Actually, we created a transaction in requestPayout. Let's try to update it if we can find it, 
            // or just create a correction transaction if rejected.

            if (status === 'approved') {
                // Funds already deducted. Just update transaction status if possible, or leave it.
                // ideally mark transaction as completed.
                await Transaction.findOneAndUpdate(
                    { walletId: wallet._id, amount: payout.amount, type: 'debit', status: 'pending', description: `Payout Request #${payout._id}` },
                    { status: 'completed' }
                );
            } else if (status === 'rejected') {
                // Refund the amount back to balance
                wallet.balance += payout.amount;
                await wallet.save();

                await Transaction.findOneAndUpdate(
                    { walletId: wallet._id, amount: payout.amount, type: 'debit', status: 'pending', description: `Payout Request #${payout._id}` },
                    { status: 'failed' }
                );

                // Optional: Create a credit transaction to show "Refund" explicitly? 
                // No, marking the debit as failed/reversed is cleaner, or deleting it, but keeping history is better.
            }

            return ApiResponse.success(res, 200, `Payout ${status}`, { payout });
        } catch (error) {
            next(error);
        }
    }
}
