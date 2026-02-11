import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/:productId', ReviewController.getProductReviews);
router.post('/', protect, ReviewController.submitReview);

export default router;
