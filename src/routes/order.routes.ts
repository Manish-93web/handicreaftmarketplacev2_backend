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
router.post('/sub-order/:subOrderId/cancel', OrderController.cancelOrder);
router.post('/sub-order/:subOrderId/return', OrderController.requestReturn);
router.patch('/sub-order/:subOrderId/return-status', restrictTo('seller', 'admin'), OrderController.processReturn);
router.get('/sub-order/:subOrderId/invoice', OrderController.generateInvoice);

export default router;
