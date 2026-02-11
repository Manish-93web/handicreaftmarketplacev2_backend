import { Router } from 'express';
import { CustomOrderController } from '../controllers/customOrder.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

// Buyer Routes
router.post('/request', CustomOrderController.createRequest);
router.get('/my-requests', CustomOrderController.getMyRequests);
router.patch('/accept-quote/:requestId', CustomOrderController.acceptQuote);

// Seller Routes
router.get('/shop-requests', restrictTo('seller', 'admin'), CustomOrderController.getShopRequests);
router.patch('/provide-quote', restrictTo('seller', 'admin'), CustomOrderController.provideQuote);

export default router;
