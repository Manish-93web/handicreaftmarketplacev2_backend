import mongoose, { Schema, Document } from 'mongoose';

export interface IUserActivity extends Document {
    userId: mongoose.Types.ObjectId;
    productId?: mongoose.Types.ObjectId; // For 'view' action
    action: 'view' | 'search';
    metadata?: any; // For search queries or other data
    createdAt: Date;
}

const UserActivitySchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    action: { type: String, enum: ['view', 'search'], required: true },
    metadata: { type: Schema.Types.Mixed }
}, { timestamps: { createdAt: true, updatedAt: false } });

// TTL Index: expire after 90 days to keep collection size manageable
UserActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const UserActivity = mongoose.model<IUserActivity>('UserActivity', UserActivitySchema);
