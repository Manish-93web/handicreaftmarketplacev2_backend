import { Router } from 'express';
import { ShopController } from '../controllers/shop.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Public Routes
router.get('/', ShopController.getShops);

// Protected Routes
router.get('/me', protect, ShopController.getMyShop);
router.get('/me/metrics', protect, ShopController.getPerformanceMetrics);

// Detailed Public Routes (must come after specific /me routes)
router.get('/:slug', ShopController.getShopBySlug);

router.use(protect); // All routes below require login

router.post('/', ShopController.createShop);
router.patch('/me', ShopController.updateShop);
router.patch('/me/kyc', ShopController.updateKYC);
router.patch('/me/vacation', ShopController.toggleVacationMode);

export default router;
