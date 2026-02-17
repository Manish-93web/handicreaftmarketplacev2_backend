import { Router } from 'express';
import { ShopController } from '../controllers/shop.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Public Routes
router.get('/', ShopController.getShops);
router.get('/:slug', ShopController.getShopBySlug);

router.use(protect); // All routes below require login

router.post('/', ShopController.createShop);
router.get('/me', ShopController.getMyShop);
router.patch('/me', ShopController.updateShop);
router.patch('/me/kyc', ShopController.updateKYC);
router.get('/me/metrics', ShopController.getPerformanceMetrics);
router.patch('/me/vacation', ShopController.toggleVacationMode);

export default router;
