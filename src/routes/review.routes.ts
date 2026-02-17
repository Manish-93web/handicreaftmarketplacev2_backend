import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/:productId', ReviewController.getProductReviews);

router.use(protect);
router.post('/', ReviewController.submitReview);
router.patch('/:id', ReviewController.editReview);
router.post('/:id/helpful', ReviewController.voteHelpful);
router.patch('/:id/status', ReviewController.updateReviewStatus);
router.delete('/:id', ReviewController.deleteReview);

export default router;
