import mongoose, { Schema, Document } from 'mongoose';

export interface ICart extends Document {
    userId: mongoose.Types.ObjectId;
    items: {
        productId: mongoose.Types.ObjectId;
        variantId?: string;
        quantity: number;
        shopId: mongoose.Types.ObjectId; // Denormalized for easier split-cart display
    }[];
    updatedAt: Date;
}

const CartSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        variantId: { type: String },
        quantity: { type: Number, default: 1, min: 1 },
        shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true }
    }]
}, { timestamps: true });

// Pre-save hook or middleware could be added to ensure quantities don't exceed stock
// but for now we'll handle it in the controller.

export const Cart = mongoose.model<ICart>('Cart', CartSchema);
