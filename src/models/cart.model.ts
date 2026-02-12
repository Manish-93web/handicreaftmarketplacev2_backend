import mongoose, { Schema, Document } from 'mongoose';

export interface ICart extends Document {
    userId: mongoose.Types.ObjectId;
    items: {
        listingId: mongoose.Types.ObjectId;
        variantId?: string; // Still useful if we have variant listings
        quantity: number;
    }[];
    updatedAt: Date;
}

const CartSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [{
        listingId: { type: Schema.Types.ObjectId, ref: 'SellerListing', required: true },
        variantId: { type: String },
        quantity: { type: Number, default: 1, min: 1 }
    }]
}, { timestamps: true });

// Pre-save hook or middleware could be added to ensure quantities don't exceed stock
// but for now we'll handle it in the controller.

export const Cart = mongoose.model<ICart>('Cart', CartSchema);
