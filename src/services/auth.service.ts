import { User, IUser } from '../models/user.model';
import { OTP } from '../models/otp.model';
import { RefreshToken } from '../models/refreshToken.model';
import { Shop } from '../models/shop.model';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppError } from '../utils/AppError';

export class AuthService {
    // Generate Access Token
    static generateAccessToken(user: IUser) {
        return jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '15m' }
        );
    }

    // Generate Refresh Token
    static async generateRefreshToken(user: IUser, ipAddress: string, userAgent?: string) {
        const token = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const refreshToken = new RefreshToken({
            userId: user._id,
            token,
            expiresAt,
            ipAddress,
            userAgent
        });
        await (refreshToken as any).save();
        return token;
    }

    // Refresh Access Token with Rotation
    static async refreshAccessToken(oldToken: string, ipAddress: string, userAgent?: string) {
        const refreshToken = await RefreshToken.findOne({ token: oldToken });

        if (!refreshToken) {
            throw new AppError('Refresh token not found', 401);
        }

        // Token Reuse Detection
        if (refreshToken.revoked) {
            // This token was already used! Potential breach.
            // Revoke all tokens for this user to be safe.
            await RefreshToken.deleteMany({ userId: refreshToken.userId });
            throw new AppError('Token already used. For security, all sessions have been revoked.', 401);
        }

        if (refreshToken.expiresAt < new Date()) {
            throw new AppError('Refresh token expired', 401);
        }

        const user = await User.findById(refreshToken.userId);
        if (!user) throw new AppError('User not found', 404);

        // Generate NEW tokens
        const newAccessToken = this.generateAccessToken(user);
        const newRefreshTokenStr = crypto.randomBytes(40).toString('hex');

        // Rotate: Revoke old, link to new
        refreshToken.revoked = true;
        refreshToken.replacedByToken = newRefreshTokenStr;
        await (refreshToken as any).save();

        // Save new refresh token
        const newRefreshToken = new RefreshToken({
            userId: user._id,
            token: newRefreshTokenStr,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            ipAddress,
            userAgent
        });
        await (newRefreshToken as any).save();

        return { accessToken: newAccessToken, refreshToken: newRefreshTokenStr };
    }

    // Register User
    static async register(userData: Partial<IUser>) {
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            throw new AppError('Email already in use', 400);
        }
        const user = await User.create(userData);
        return user;
    }

    // Register Seller Application
    static async registerSeller(data: any) {
        const { name, email, phone, shopName, businessDetails } = data;

        // 1. Check if email exists
        const existingUser = await User.findOne({ email });
        if (existingUser) throw new AppError('Email already in use', 400);

        // 2. Create User as Seller (Not verified)
        // Set a random placeholder password so they can't login until admin sets a real one
        const placeholderPassword = crypto.randomBytes(32).toString('hex');
        const user = await User.create({
            name,
            email,
            phone,
            role: 'seller',
            password: placeholderPassword,
            isVerified: false
        });

        // 3. Create Shop
        // Store businessDetails (text description from registration form) in the description field
        // The businessDetails object (pan, gstin, address) will be filled later during KYC
        const slug = shopName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();
        const shop = await Shop.create({
            sellerId: user._id,
            name: shopName,
            slug,
            description: businessDetails, // Store the seller's business description here
            kycStatus: 'pending'
        });

        return { user, shop };
    }

    // Login User
    static async login(email: string, password: string) {
        // Explicitly select password since it is set to select: false
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            throw new AppError('Invalid email or password', 401);
        }
        return user;
    }

    // Generate OTP
    static async generateOTP(email: string) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

        await OTP.findOneAndUpdate(
            { email },
            { otp, expiresAt },
            { upsert: true, returnDocument: 'after' }
        );

        return otp;
    }

    // Verify OTP
    static async verifyOTP(email: string, otp: string) {
        const record = await OTP.findOne({ email, otp });
        if (!record || record.expiresAt < new Date()) {
            throw new AppError('Invalid or expired OTP', 400);
        }
        await OTP.deleteOne({ _id: record._id });

        // If used for verification, update user status
        await User.findOneAndUpdate({ email }, { isVerified: true });

        return true;
    }

    // Forgot Password - Step 1: Send OTP
    static async forgotPassword(email: string) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new AppError('No user found with that email address', 404);
        }

        const otp = await this.generateOTP(email);
        // In real scenario, trigger email job here
        return otp;
    }

    // Forgot Password - Step 2: Reset Password with OTP
    static async resetPassword(email: string, otp: string, password: string) {
        const record = await OTP.findOne({ email, otp });
        if (!record || record.expiresAt < new Date()) {
            throw new AppError('Invalid or expired OTP', 400);
        }

        const user = await User.findOne({ email });
        if (!user) throw new AppError('User not found', 404);

        user.password = password;
        await user.save();

        await OTP.deleteOne({ _id: record._id });
        return true;
    }

    // Google OAuth Login Scaffolding
    static async googleLogin(idToken: string) {
        // In real app, verify idToken with google-auth-library
        // For now, mockup user finding/creation
        const mockPayload = { email: 'user@gmail.com', name: 'Google User' }; // Placeholder

        let user = await User.findOne({ email: mockPayload.email });
        if (!user) {
            user = await User.create({
                email: mockPayload.email,
                name: mockPayload.name,
                role: 'buyer',
                isVerified: true
            });
        }
        return user;
    }
}
