import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    title: string;
    slug: string;
    description: string;
    shortDescription?: string;

    category: mongoose.Types.ObjectId;
    subCategory?: mongoose.Types.ObjectId;
    brand?: string;

    images: string[];
    videos?: string[];

    productType: 'simple' | 'variable' | 'digital';
    attributes?: {
        name: string;
        options: string[];
    }[];
    variants?: {
        sku: string;
        price: number;
        stock: number;
        stockStatus: 'in_stock' | 'out_of_stock' | 'on_backorder';
        allowBackorder: boolean;
        condition: 'new' | 'used_like_new' | 'used_good' | 'used_fair' | 'refurbished';
        attributes: Record<string, string>;
        image?: string;
    }[];

    specifications?: {
        key: string;
        value: string;
    }[];

    tags: string[];
    isPublished: boolean;
    isFeatured: boolean;
    isHandmade: boolean;

    isPersonalizable: boolean;
    personalizationFields?: {
        name: string;
        type: 'text' | 'image';
    }[];
    isSponsored: boolean;
    sponsoredUntil?: Date;

    seoTitle?: string;
    seoDescription?: string;

    ratings: {
        average: number;
        count: number;
    };
    approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected';
    digitalFileUrl?: string;
    isMadeToOrder: boolean;
    fixedCommissionFee?: number; // Override category-based percentage
    hsnCode?: string; // Goods and Services Tax code

    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    sku: { type: String, required: true },
    stock: { type: Number, default: 0 },
    stockStatus: {
        type: String,
        enum: ['in_stock', 'out_of_stock', 'on_backorder'],
        default: 'in_stock'
    },
    allowBackorder: { type: Boolean, default: false },
    condition: {
        type: String,
        enum: ['new', 'used_like_new', 'used_good', 'used_fair', 'refurbished'],
        required: true
    },
    description: { type: String, required: true },
    shortDescription: { type: String },

    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    brand: { type: String },

    images: [{ type: String }],
    videos: [{ type: String }],

    productType: {
        type: String,
        enum: ['simple', 'variable', 'digital'],
        default: 'simple'
    },

    attributes: [{
        name: String,
        options: [String]
    }],

    variants: [{
        sku: String,
        price: Number,
        stock: Number,
        attributes: { type: Map, of: String },
        image: String
    }],

    specifications: [{
        key: String,
        value: String
    }],

    tags: [String],

    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isHandmade: { type: Boolean, default: true },

    isPersonalizable: { type: Boolean, default: false },
    personalizationFields: [{
        name: String,
        type: { type: String, enum: ['text', 'image'] }
    }],
    isSponsored: { type: Boolean, default: false },
    sponsoredUntil: { type: Date },

    seoTitle: String,
    seoDescription: String,

    ratings: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    },
    approvalStatus: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected'],
        default: 'draft'
    },
    digitalFileUrl: { type: String },
    isMadeToOrder: { type: Boolean, default: false },
    fixedCommissionFee: { type: Number },
    hsnCode: { type: String }
}, { timestamps: true });

ProductSchema.index({ title: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
