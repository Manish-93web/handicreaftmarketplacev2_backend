import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.get('/admin/dashboard', restrictTo('admin'), AnalyticsController.getAdminAnalytics);
router.get('/seller/dashboard', restrictTo('seller'), AnalyticsController.getSellerAnalytics);
router.get('/reports', restrictTo('admin', 'seller'), AnalyticsController.getReports);

export default router;
