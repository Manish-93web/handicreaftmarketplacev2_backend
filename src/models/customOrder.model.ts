import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomOrder extends Document {
    buyerId: mongoose.Types.ObjectId;
    sellerId: mongoose.Types.ObjectId;
    productId?: mongoose.Types.ObjectId;
    description: string;
    attachments: string[];
    budget?: number;
    deadline?: Date;
    status: 'pending' | 'quoted' | 'accepted' | 'rejected' | 'completed';
    quotePrice?: number;
    createdAt: Date;
    updatedAt: Date;
}

const CustomOrderSchema: Schema = new Schema({
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    description: { type: String, required: true },
    attachments: [{ type: String }],
    budget: { type: Number },
    deadline: { type: Date },
    status: {
        type: String,
        enum: ['pending', 'quoted', 'accepted', 'rejected', 'completed'],
        default: 'pending'
    },
    quotePrice: { type: Number },
}, { timestamps: true });

export const CustomOrder = mongoose.model<ICustomOrder>('CustomOrder', CustomOrderSchema);
