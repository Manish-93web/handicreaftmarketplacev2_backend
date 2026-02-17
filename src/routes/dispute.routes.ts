import { Router } from 'express';
import { DisputeController } from '../controllers/dispute.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.post('/', DisputeController.openDispute);
router.get('/my', DisputeController.getMyDisputes);
router.get('/:id', DisputeController.getDisputeById);

// Admin Routes
router.get('/', restrictTo('admin'), DisputeController.getAllDisputes);
router.patch('/:id/resolve', restrictTo('admin'), DisputeController.resolveDispute);

export default router;
