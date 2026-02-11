import User, { IUser } from '../models/user.model';
import OTP from '../models/otp.model';
import RefreshToken from '../models/refreshToken.model';
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
    static async generateRefreshToken(user: IUser, ipAddress: string) {
        const token = crypto.randomBytes(40).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const refreshToken = new RefreshToken({
            userId: user._id,
            token,
            expiresAt,
        });
        await refreshToken.save();
        return token;
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
            { upsert: true, new: true }
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
}
