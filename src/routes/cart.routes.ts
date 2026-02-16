import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect); // All cart routes require auth

router.get('/', CartController.getCart);
router.post('/add', CartController.addToCart);
router.patch('/quantity', CartController.updateQuantity);
router.delete('/:listingId', CartController.removeFromCart);

export default router;
