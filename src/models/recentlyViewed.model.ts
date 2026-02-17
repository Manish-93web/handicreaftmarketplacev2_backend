import mongoose, { Schema, Document } from 'mongoose';

export interface IRecentlyViewed extends Document {
    userId: mongoose.Types.ObjectId;
    productIds: mongoose.Types.ObjectId[];
    updatedAt: Date;
}

const RecentlyViewedSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });

export const RecentlyViewed = mongoose.model<IRecentlyViewed>('RecentlyViewed', RecentlyViewedSchema);
