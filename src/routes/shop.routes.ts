import { Router } from 'express';
import { ShopController } from '../controllers/shop.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect); // All routes require login

router.post('/', ShopController.createShop);
router.get('/me', ShopController.getMyShop);
router.patch('/me', ShopController.updateShop);

export default router;
