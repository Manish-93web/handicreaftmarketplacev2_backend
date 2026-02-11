import mongoose, { Schema, Document } from 'mongoose';

export interface IPrivacyRequest extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'data_export' | 'account_deletion';
    status: 'pending' | 'processing' | 'completed' | 'cancelled';
    requestDate: Date;
    completionDate?: Date;
    resultsUrl?: string; // For data export links (encrypted/secured)
    reason?: string;
}

const PrivacyRequestSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['data_export', 'account_deletion'] },
    status: { type: String, default: 'pending', enum: ['pending', 'processing', 'completed', 'cancelled'] },
    requestDate: { type: Date, default: Date.now },
    completionDate: { type: Date },
    resultsUrl: { type: String },
    reason: { type: String },
}, { timestamps: true });

export const PrivacyRequest = mongoose.model<IPrivacyRequest>('PrivacyRequest', PrivacyRequestSchema);
