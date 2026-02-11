import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class AuthController {

    static async register(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await AuthService.register(req.body);
            // Automatically generate OTP for verification maybe? 
            // For now just return success
            return ApiResponse.success(res, 201, 'User registered successfully', { user });
        } catch (error) {
            next(error);
        }
    }

    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const user = await AuthService.login(email, password);

            const accessToken = AuthService.generateAccessToken(user);
            const refreshToken = await AuthService.generateRefreshToken(user, req.ip || '');

            // Set Refresh Token in HttpOnly Cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            return ApiResponse.success(res, 200, 'Login successful', {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                accessToken
            });
        } catch (error) {
            next(error);
        }
    }

    static async sendOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            const otp = await AuthService.generateOTP(email);
            // In real scenario, send this OTP via Email Service (BullMQ job)
            // For dev, returning in response
            return ApiResponse.success(res, 200, 'OTP sent', { otp });
        } catch (error) {
            next(error);
        }
    }

    static async verifyOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp } = req.body;
            await AuthService.verifyOTP(email, otp);
            return ApiResponse.success(res, 200, 'Email verified successfully');
        } catch (error) {
            next(error);
        }
    }

    static async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.cookies;
            // In real app, mark refresh token as revoked in DB
            res.clearCookie('refreshToken');
            return ApiResponse.success(res, 200, 'Logged out successfully');
        } catch (error) {
            next(error);
        }
    }
}
