import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect); // All cart routes require auth

router.get('/', CartController.getCart);
router.post('/add', CartController.addToCart);
router.post('/merge', CartController.mergeCart);
router.patch('/quantity', CartController.updateQuantity);
router.delete('/:listingId', CartController.removeFromCart);
router.patch('/:listingId/save-for-later', CartController.toggleSaveForLater);
router.patch('/:listingId/gift-wrap', CartController.toggleGiftWrap);

export default router;
