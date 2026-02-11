import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.post('/request', restrictTo('seller'), WalletController.requestPayout);
router.get('/my-payouts', restrictTo('seller'), WalletController.getMyPayouts);

// Admin Routes
router.get('/all', restrictTo('admin'), WalletController.getAllPayouts);
router.patch('/:id/status', restrictTo('admin'), WalletController.updatePayoutStatus);

export default router;
