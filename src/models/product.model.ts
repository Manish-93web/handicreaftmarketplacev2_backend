import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    shopId: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    description: string;
    shortDescription?: string;
    price: number;
    salePrice?: number;
    sku: string;
    stock: number;
    isTrackQuantity: boolean;
    isContinueSelling: boolean; // Continue selling when out of stock

    category: mongoose.Types.ObjectId;
    subCategory?: mongoose.Types.ObjectId;
    brand?: string;

    images: string[];
    videos?: string[];

    productType: 'simple' | 'variable' | 'digital';
    attributes?: {
        name: string; // e.g., Color
        options: string[]; // e.g., [Red, Blue]
    }[];
    variants?: {
        sku: string;
        price: number;
        stock: number;
        attributes: Record<string, string>; // e.g., { Color: Red, Size: M }
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

    seoTitle?: string;
    seoDescription?: string;

    ratings: {
        average: number;
        count: number;
    };

    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String },

    price: { type: Number, required: true },
    salePrice: { type: Number },
    sku: { type: String, required: true, unique: true },
    stock: { type: Number, default: 0 },
    isTrackQuantity: { type: Boolean, default: true },
    isContinueSelling: { type: Boolean, default: false },

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

    seoTitle: String,
    seoDescription: String,

    ratings: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    }
}, { timestamps: true });

ProductSchema.index({ title: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ shopId: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ price: 1 });

export default mongoose.model<IProduct>('Product', ProductSchema);
