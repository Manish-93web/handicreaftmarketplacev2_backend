import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { User } from '../models/user.model';

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
            const refreshToken = await AuthService.generateRefreshToken(
                user,
                req.ip || '',
                req.headers['user-agent']
            );

            // Set Refresh Token in HttpOnly Cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
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

    static async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken: oldToken } = req.cookies;
            if (!oldToken) throw new AppError('No refresh token provided', 401);

            const { accessToken, refreshToken: newRefreshTokenStr } = await AuthService.refreshAccessToken(
                oldToken,
                req.ip || '',
                req.headers['user-agent']
            );

            // Set New Refresh Token in HttpOnly Cookie
            res.cookie('refreshToken', newRefreshTokenStr, {
                httpOnly: true,
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            });

            return ApiResponse.success(res, 200, 'Token refreshed', { accessToken });
        } catch (error) {
            next(error);
        }
    }

    static async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.cookies;
            if (refreshToken) {
                const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
                if (tokenDoc) {
                    tokenDoc.revoked = true;
                    await (tokenDoc as any).save();
                }
            }
            res.clearCookie('refreshToken', { path: '/' });
            return ApiResponse.success(res, 200, 'Logged out successfully');
        } catch (error) {
            next(error);
        }
    }

    static async getActiveSessions(req: Request, res: Response, next: NextFunction) {
        try {
            const sessions = await RefreshToken.find({
                userId: req.user?._id,
                revoked: false,
                expiresAt: { $gt: new Date() }
            }).select('ipAddress userAgent createdAt lastUsed');

            return ApiResponse.success(res, 200, 'Active sessions fetched', { sessions });
        } catch (error) {
            next(error);
        }
    }

    static async logoutFromDevice(req: Request, res: Response, next: NextFunction) {
        try {
            const { sessionId } = req.params;
            const session = await RefreshToken.findOne({ _id: sessionId, userId: req.user?._id });
            if (!session) throw new AppError('Session not found', 404);

            session.revoked = true;
            await (session as any).save();

            return ApiResponse.success(res, 200, 'Device logged out');
        } catch (error) {
            next(error);
        }
    }

    static async logoutAllDevices(req: Request, res: Response, next: NextFunction) {
        try {
            await RefreshToken.updateMany(
                { userId: req.user?._id, revoked: false },
                { revoked: true }
            );
            res.clearCookie('refreshToken', { path: '/' });
            return ApiResponse.success(res, 200, 'Logged out from all devices');
        } catch (error) {
            next(error);
        }
    }

    static async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            const otp = await AuthService.forgotPassword(email);
            return ApiResponse.success(res, 200, 'Reset OTP sent to email', { otp });
        } catch (error) {
            next(error);
        }
    }

    static async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp, password } = req.body;
            await AuthService.resetPassword(email, otp, password);
            return ApiResponse.success(res, 200, 'Password reset successful');
        } catch (error) {
            next(error);
        }
    }

    static async googleLogin(req: Request, res: Response, next: NextFunction) {
        try {
            const { idToken } = req.body;
            const user = await AuthService.googleLogin(idToken);

            const accessToken = AuthService.generateAccessToken(user);
            const refreshToken = await AuthService.generateRefreshToken(
                user,
                req.ip || '',
                req.headers['user-agent']
            );

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            });

            return ApiResponse.success(res, 200, 'Google login successful', {
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
}
