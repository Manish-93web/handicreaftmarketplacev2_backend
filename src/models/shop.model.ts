import mongoose, { Schema, Document } from 'mongoose';

export interface IShop extends Document {
    sellerId: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    logo?: string;
    banner?: string;
    address?: string;
    isVerified: boolean;
    kycStatus: 'pending' | 'approved' | 'rejected';
    kycDocuments: {
        documentType: string;
        url: string;
    }[];
    policies?: {
        returnPolicy?: string;
        shippingPolicy?: string;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ShopSchema: Schema = new Schema({
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    logo: { type: String },
    banner: { type: String },
    address: { type: String },
    isVerified: { type: Boolean, default: false },
    kycStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    kycDocuments: [{
        documentType: { type: String },
        url: { type: String }
    }],
    policies: {
        returnPolicy: { type: String },
        shippingPolicy: { type: String }
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

ShopSchema.index({ name: 'text', description: 'text' });

export const Shop = mongoose.model<IShop>('Shop', ShopSchema);
