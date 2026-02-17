import mongoose, { Schema, Document } from 'mongoose';

export interface IDispute extends Document {
    subOrderId: mongoose.Types.ObjectId;
    buyerId: mongoose.Types.ObjectId;
    sellerId: mongoose.Types.ObjectId;
    reason: string;
    description: string;
    evidence: string[];
    status: 'opened' | 'under_review' | 'resolved' | 'rejected';
    resolution?: 'refund_issued' | 'funds_released' | 'partial_refund';
    adminNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

const DisputeSchema: Schema = new Schema({
    subOrderId: { type: Schema.Types.ObjectId, ref: 'SubOrder', required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
        type: String,
        required: true,
        enum: ['item_not_received', 'item_not_as_described', 'damaged_item', 'other']
    },
    description: { type: String, required: true },
    evidence: [{ type: String }],
    status: {
        type: String,
        enum: ['opened', 'under_review', 'resolved', 'rejected'],
        default: 'opened'
    },
    resolution: {
        type: String,
        enum: ['refund_issued', 'funds_released', 'partial_refund'],
    },
    adminNote: String
}, { timestamps: true });

export const Dispute = mongoose.model<IDispute>('Dispute', DisputeSchema);
