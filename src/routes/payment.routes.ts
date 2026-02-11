import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.post('/initiate', protect, PaymentController.initiatePayment);
router.post('/webhook', PaymentController.verifyPaymentWebhook); // Webhook usually public but verified via signature

export default router;
