import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.post('/place', OrderController.placeOrder);
router.get('/my-orders', OrderController.getMyOrders);
router.get('/shop-orders', restrictTo('seller', 'admin'), OrderController.getShopOrders);
router.get('/:id', OrderController.getOrderById);
router.patch('/sub-order/:subOrderId/status', restrictTo('seller', 'admin'), OrderController.updateSubOrderStatus);
router.patch('/sub-order/:subOrderId/tracking', restrictTo('seller', 'admin'), OrderController.updateSubOrderTracking);

export default router;
