import { Request, Response, NextFunction } from 'express';
import { Coupon } from '../models/coupon.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class CouponController {

    static async createCoupon(req: Request, res: Response, next: NextFunction) {
        try {
            const coupon = await Coupon.create(req.body);
            return ApiResponse.success(res, 201, 'Coupon created', { coupon });
        } catch (error) {
            next(error);
        }
    }

    static async validateCoupon(req: Request, res: Response, next: NextFunction) {
        try {
            const { code, amount } = req.body;
            const coupon = await Coupon.findOne({ code, isActive: true });

            if (!coupon) throw new AppError('Invalid or expired coupon', 400);
            if (new Date() > coupon.expiryDate) throw new AppError('Coupon has expired', 400);
            if (amount < coupon.minOrderAmount) throw new AppError(`Min order amount ₹${coupon.minOrderAmount} required`, 400);
            if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError('Coupon usage limit reached', 400);

            let discount = 0;
            if (coupon.discountType === 'percentage') {
                discount = (amount * coupon.discountAmount) / 100;
                if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                    discount = coupon.maxDiscountAmount;
                }
            } else {
                discount = coupon.discountAmount;
            }

            return ApiResponse.success(res, 200, 'Coupon is valid', {
                discount,
                code: coupon.code,
                discountType: coupon.discountType,
                discountAmount: coupon.discountAmount
            });
        } catch (error) {
            next(error);
        }
    }

    static async getAllCoupons(req: Request, res: Response, next: NextFunction) {
        try {
            const coupons = await Coupon.find().sort('-createdAt');
            return ApiResponse.success(res, 200, 'Coupons fetched', { coupons });
        } catch (error) {
            next(error);
        }
    }

    static async deleteCoupon(req: Request, res: Response, next: NextFunction) {
        try {
            await Coupon.findByIdAndDelete(req.params.id);
            return ApiResponse.success(res, 200, 'Coupon deleted', null);
        } catch (error) {
            next(error);
        }
    }
}
