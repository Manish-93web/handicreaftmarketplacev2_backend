import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
    reporterId: mongoose.Types.ObjectId;
    targetType: 'product' | 'review' | 'shop' | 'user';
    targetId: mongoose.Types.ObjectId;
    reason: string;
    description?: string;
    status: 'pending' | 'resolved' | 'dismissed';
    actionTaken?: string;
    resolvedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ReportSchema: Schema = new Schema({
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
        type: String,
        enum: ['product', 'review', 'shop', 'user'],
        required: true
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true }, // e.g., 'spam', 'inappropriate', 'counterfeit'
    description: { type: String },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'dismissed'],
        default: 'pending'
    },
    actionTaken: { type: String },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

export const Report = mongoose.model<IReport>('Report', ReportSchema);
