import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/:productId', ReviewController.getProductReviews);

router.use(protect);
router.post('/', ReviewController.submitReview);
// router.delete('/:id', restrictTo('admin', 'user'), ReviewController.deleteReview); // TODO: Implement delete

export default router;
