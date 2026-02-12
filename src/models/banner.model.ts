import { Schema, model, Document } from 'mongoose';

export interface IBanner extends Document {
    title: string;
    subtitle: string;
    imageUrl: string;
    linkUrl: string;
    isActive: boolean;
    order: number;
    placement: 'hero' | 'sidebar' | 'footer';
}

const BannerSchema = new Schema<IBanner>({
    title: { type: String, required: true },
    subtitle: { type: String },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, default: '#' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    placement: { type: String, enum: ['hero', 'sidebar', 'footer'], default: 'hero' }
}, { timestamps: true });

export const Banner = model<IBanner>('Banner', BannerSchema);
