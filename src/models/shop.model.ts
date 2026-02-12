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
    rejectionReason?: string;
    rejectedAt?: Date;
    kycDocuments: {
        documentType: string;
        url: string;
    }[];
    policies?: {
        returnPolicy?: string;
        shippingPolicy?: string;
    };
    vacationMode: {
        isActive: boolean;
        startDate?: Date;
        endDate?: Date;
        message?: string;
    };
    performanceScore: number;
    lateShipmentCount: number;
    subscriptionPlan: 'basic' | 'pro' | 'premium';
    businessDetails?: {
        pan: string;
        gstin?: string;
        address: string;
    };
    bankDetails?: {
        accountHolderName: string;
        accountNumber: string;
        ifscCode: string;
        bankName: string;
    };
    commissionOverride?: number;
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
    rejectionReason: { type: String },
    rejectedAt: { type: Date },
    kycDocuments: [{
        documentType: { type: String },
        url: { type: String }
    }],
    policies: {
        returnPolicy: { type: String },
        shippingPolicy: { type: String }
    },
    vacationMode: {
        isActive: { type: Boolean, default: false },
        startDate: { type: Date },
        endDate: { type: Date },
        message: { type: String }
    },
    performanceScore: { type: Number, default: 0 },
    lateShipmentCount: { type: Number, default: 0 },
    subscriptionPlan: {
        type: String,
        enum: ['basic', 'pro', 'premium'],
        default: 'basic'
    },
    commissionOverride: { type: Number },
    businessDetails: {
        pan: { type: String },
        gstin: { type: String },
        address: { type: String }
    },
    bankDetails: {
        accountHolderName: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String },
        bankName: { type: String }
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

ShopSchema.index({ name: 'text', description: 'text' });

export const Shop = mongoose.model<IShop>('Shop', ShopSchema);
