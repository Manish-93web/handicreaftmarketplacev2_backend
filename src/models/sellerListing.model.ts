import mongoose, { Schema, Document } from 'mongoose';

export interface ISellerListing extends Document {
    productId: mongoose.Types.ObjectId;
    shopId: mongoose.Types.ObjectId;
    price: number;
    salePrice?: number;
    sku: string;
    stock: number;
    stockStatus: 'in_stock' | 'out_of_stock' | 'on_backorder';
    allowBackorder: boolean;
    isTrackQuantity: boolean;
    isContinueSelling: boolean;
    bulkPricing?: {
        minQty: number;
        price: number;
    }[];
    condition: 'new' | 'refurbished' | 'used';
    shippingSpeed: 'standard' | 'expedited' | 'overnight';
    isBuyBoxWinner: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SellerListingSchema: Schema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    price: { type: Number, required: true },
    salePrice: { type: Number },
    sku: { type: String, required: true },
    stock: { type: Number, default: 0 },
    stockStatus: {
        type: String,
        enum: ['in_stock', 'out_of_stock', 'on_backorder'],
        default: 'in_stock'
    },
    allowBackorder: { type: Boolean, default: false },
    isTrackQuantity: { type: Boolean, default: true },
    isContinueSelling: { type: Boolean, default: false },
    bulkPricing: [{
        minQty: Number,
        price: Number
    }],
    condition: {
        type: String,
        enum: ['new', 'refurbished', 'used'],
        default: 'new'
    },
    shippingSpeed: {
        type: String,
        enum: ['standard', 'expedited', 'overnight'],
        default: 'standard'
    },
    isBuyBoxWinner: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure a seller can only have one listing per product
SellerListingSchema.index({ productId: 1, shopId: 1 }, { unique: true });
SellerListingSchema.index({ productId: 1, price: 1 });
SellerListingSchema.index({ shopId: 1 });

export const SellerListing = mongoose.model<ISellerListing>('SellerListing', SellerListingSchema);
