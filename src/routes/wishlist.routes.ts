import { Router } from 'express';
import { WishlistController } from '../controllers/wishlist.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect); // All wishlist routes require authentication

router.get('/me', WishlistController.getWishlist);
router.post('/add', WishlistController.addToWishlist);
router.delete('/:listingId', WishlistController.removeFromWishlist);

export default router;
