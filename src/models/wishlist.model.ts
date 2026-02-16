import mongoose, { Schema, Document } from 'mongoose';

export interface IWishlist extends Document {
    userId: mongoose.Types.ObjectId;
    items: {
        listingId: mongoose.Types.ObjectId;
        addedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const WishlistSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [{
        listingId: { type: Schema.Types.ObjectId, ref: 'SellerListing', required: true },
        addedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export const Wishlist = mongoose.model<IWishlist>('Wishlist', WishlistSchema);
