import mongoose, { Schema, Document } from 'mongoose';

export interface IFollow extends Document {
    buyerId: mongoose.Types.ObjectId;
    shopId: mongoose.Types.ObjectId;
    createdAt: Date;
}

const FollowSchema: Schema = new Schema({
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true }
}, { timestamps: true });

// Ensure a buyer can only follow a shop once
FollowSchema.index({ buyerId: 1, shopId: 1 }, { unique: true });

export const Follow = mongoose.model<IFollow>('Follow', FollowSchema);
