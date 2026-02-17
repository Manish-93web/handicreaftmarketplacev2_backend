import mongoose from 'mongoose';

// Parent Order Interface
export interface IOrder extends mongoose.Document {
    buyerId: mongoose.Types.ObjectId;
    totalAmount: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    grandTotal: number;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentMethod: string;
    shippingAddress: any;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded' | 'returned';
    trackingNumber?: string;
    fraudScore: number;
    isFlagged: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Sub Order Interface
export interface ISubOrder extends mongoose.Document {
    orderId: mongoose.Types.ObjectId;
    shopId: mongoose.Types.ObjectId;
    items: {
        listingId: mongoose.Types.ObjectId;
        productId: mongoose.Types.ObjectId;
        title: string;
        price: number;
        quantity: number;
        image: string;
        status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded' | 'returned' | 'exchanged';
        returnStatus: 'none' | 'requested' | 'approved' | 'rejected' | 'refunded';
    }[];
    subTotal: number;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded' | 'returned' | 'exchanged';
    trackingNumber?: string;
    carrier?: string;
    returnReason?: string;
    returnStatus: 'none' | 'requested' | 'approved' | 'rejected' | 'refunded';
    returnEvidence?: string[];
    commission: number;
    netAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema = new mongoose.Schema({
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalAmount: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    shippingAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: { type: String, required: true },
    shippingAddress: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'returned'],
        default: 'pending'
    },
    trackingNumber: { type: String, default: null },
    fraudScore: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false }
}, { timestamps: true });

const SubOrderSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    items: [{
        listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerListing', required: true },
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        title: String,
        price: Number,
        quantity: Number,
        image: String,
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'returned', 'exchanged'],
            default: 'pending'
        },
        returnStatus: {
            type: String,
            enum: ['none', 'requested', 'approved', 'rejected', 'refunded'],
            default: 'none'
        }
    }],
    subTotal: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'returned', 'exchanged'],
        default: 'pending'
    },
    trackingNumber: { type: String, default: null },
    carrier: { type: String, default: null },
    returnReason: { type: String, default: null },
    returnStatus: {
        type: String,
        enum: ['none', 'requested', 'approved', 'rejected', 'refunded'],
        default: 'none'
    },
    returnEvidence: [{ type: String }], // Array of URLs
    commission: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 }
}, { timestamps: true });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
export const SubOrder = mongoose.model<ISubOrder>('SubOrder', SubOrderSchema);
