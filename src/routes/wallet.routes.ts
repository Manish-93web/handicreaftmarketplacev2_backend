import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.get('/me', WalletController.getMyWallet);
router.post('/payout-request', WalletController.requestPayout);
router.get('/my-payouts', WalletController.getMyPayouts);

export default router;
