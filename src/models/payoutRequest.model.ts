import mongoose, { Schema, Document } from 'mongoose';

export interface IPayoutRequest extends Document {
    sellerId: mongoose.Types.ObjectId;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    adminNote?: string;
    transactionId?: string; // Bank transaction ID
    createdAt: Date;
    updatedAt: Date;
}

const PayoutRequestSchema: Schema = new Schema({
    sellerId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true }, // Linking to Shop/User
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNote: { type: String },
    transactionId: { type: String }
}, { timestamps: true });

export const PayoutRequest = mongoose.model<IPayoutRequest>('PayoutRequest', PayoutRequestSchema);
