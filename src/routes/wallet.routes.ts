import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.get('/me', WalletController.getMyWallet);

export default router;
