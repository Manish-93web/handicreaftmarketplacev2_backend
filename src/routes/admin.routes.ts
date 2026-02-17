import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { CategoryController } from '../controllers/category.controller';
import { ReviewController } from '../controllers/review.controller';
import { BannerController } from '../controllers/banner.controller';
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

router.get('/products/pending', AdminController.getPendingProducts);
router.patch('/products/:productId/review', AdminController.reviewProduct);

// Review Management
router.get('/reviews', ReviewController.getAllReviews);
router.patch('/reviews/:id/status', ReviewController.updateReviewStatus);
router.delete('/reviews/:id', ReviewController.deleteReview);

// Category Management
router.get('/categories', CategoryController.getCategories);
router.post('/categories', CategoryController.createCategory);
router.patch('/categories/:id', CategoryController.updateCategory);
router.delete('/categories/:id', CategoryController.deleteCategory);

// Banner Management
router.get('/banners', BannerController.getAllBanners);
router.post('/banners', BannerController.createBanner);
router.patch('/banners/:id', BannerController.updateBanner);
router.delete('/banners/:id', BannerController.deleteBanner);

router.get('/stats', AdminController.getDashboardStats);

export default router;
