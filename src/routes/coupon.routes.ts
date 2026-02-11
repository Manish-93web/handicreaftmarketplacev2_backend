import { Router } from 'express';
import { CouponController } from '../controllers/coupon.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Publicly validate a coupon during checkout
router.post('/validate', protect, CouponController.validateCoupon);

// Admin routes for managing coupons
router.use(protect);
router.use(restrictTo('admin'));

router.get('/', CouponController.getAllCoupons);
router.post('/', CouponController.createCoupon);
router.delete('/:id', CouponController.deleteCoupon);

export default router;
