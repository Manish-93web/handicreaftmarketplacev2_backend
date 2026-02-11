import mongoose, { Schema, Document } from 'mongoose';

// Parent Order
export interface IOrder extends Document {
    buyerId: mongoose.Types.ObjectId;
    totalAmount: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    grandTotal: number;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentMethod: string;
    shippingAddress: any;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    trackingNumber?: string;
}

const OrderSchema: Schema = new Schema({
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
    shippingAddress: { type: Object, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    trackingNumber: String
}, { timestamps: true });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);

// Sub Order (Split per Shop)
export interface ISubOrder extends Document {
    orderId: mongoose.Types.ObjectId; // Parent Order
    shopId: mongoose.Types.ObjectId;
    items: {
        productId: mongoose.Types.ObjectId;
        title: string;
        price: number;
        quantity: number;
        image: string;
    }[];
    subTotal: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    trackingNumber?: string;
    carrier?: string;
}

const SubOrderSchema: Schema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    items: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        title: String,
        price: Number,
        quantity: Number,
        image: String
    }],
    subTotal: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    trackingNumber: String,
    carrier: String
}, { timestamps: true });

export const SubOrder = mongoose.model<ISubOrder>('SubOrder', SubOrderSchema);
