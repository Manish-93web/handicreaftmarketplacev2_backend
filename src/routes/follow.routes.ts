import { Router } from 'express';
import { FollowController } from '../controllers/follow.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.post('/toggle', FollowController.toggleFollow);
router.get('/my-follows', FollowController.getFollowedShops);
router.get('/status/:shopId', FollowController.checkFollowStatus);

export default router;
