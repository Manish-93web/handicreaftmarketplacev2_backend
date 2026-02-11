import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    role: 'admin' | 'sub-admin' | 'seller' | 'buyer' | 'guest';
    isVerified: boolean;
    walletBalance: number;
    avatar?: string;
    privacyPreferences?: {
        marketingEmails: boolean;
        cookieConsent: boolean;
        analytics: boolean;
    };
    deletionScheduledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, select: false },
        phone: { type: String },
        role: {
            type: String,
            enum: ['admin', 'sub-admin', 'seller', 'buyer', 'guest'],
            default: 'guest',
        },
        isVerified: { type: Boolean, default: false },
        walletBalance: { type: Number, default: 0 },
        avatar: { type: String },
        privacyPreferences: {
            marketingEmails: { type: Boolean, default: false },
            cookieConsent: { type: Boolean, default: false },
            analytics: { type: Boolean, default: false },
        },
        deletionScheduledAt: { type: Date },
    },
    { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function () {
    const user = this as any;
    if (!user.isModified('password') || !user.password) return;

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema);
