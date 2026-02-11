import { Router } from 'express';
import { RecommendationController } from '../controllers/recommendation.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/trending', RecommendationController.getTrendingProducts);

router.use(protect);
router.get('/recently-viewed', RecommendationController.getRecentlyViewed);
router.get('/for-you', RecommendationController.getPersonalizedRecommendations);

export default router;
