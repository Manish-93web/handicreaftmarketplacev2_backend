import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    slug: string;
    parent?: mongoose.Types.ObjectId;
    image?: string;
    description?: string;
    isActive: boolean;
    level: number;
    ancestors: { _id: mongoose.Types.ObjectId, name: string, slug: string }[];
}

const CategorySchema: Schema = new Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    image: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    level: { type: Number, default: 0 },
    ancestors: [{
        _id: { type: Schema.Types.ObjectId, ref: 'Category' },
        name: String,
        slug: String
    }]
}, { timestamps: true });

CategorySchema.index({ parent: 1 });
CategorySchema.index({ slug: 1 });

export default mongoose.model<ICategory>('Category', CategorySchema);
