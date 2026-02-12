import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// All admin routes are protected and restricted to 'admin' role
router.use(protect);
router.use(restrictTo('admin'));

router.get('/users', AdminController.getAllUsers);
router.patch('/users/:userId/status', AdminController.updateUserStatus);

router.get('/shops', AdminController.getAllShops);
router.patch('/shops/:shopId/approve', AdminController.approveShopKYC);
router.patch('/shops/:shopId/reject', AdminController.rejectShopKYC);
router.patch('/products/:productId/review', AdminController.reviewProduct);

router.get('/stats', AdminController.getDashboardStats);

export default router;
