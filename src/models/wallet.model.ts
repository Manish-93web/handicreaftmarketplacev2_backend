import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
    userId: mongoose.Types.ObjectId;
    balance: number;
    pendingBalance: number;
    currency: string;
}

const WalletSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' }
}, { timestamps: true });

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);

export interface ITransaction extends Document {
    walletId: mongoose.Types.ObjectId;
    amount: number;
    type: 'credit' | 'debit';
    status: 'pending' | 'completed' | 'failed';
    description: string;
    orderId?: mongoose.Types.ObjectId;
    subOrderId?: mongoose.Types.ObjectId;
}

const TransactionSchema: Schema = new Schema({
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    description: String,
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    subOrderId: { type: Schema.Types.ObjectId, ref: 'SubOrder' }
}, { timestamps: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
