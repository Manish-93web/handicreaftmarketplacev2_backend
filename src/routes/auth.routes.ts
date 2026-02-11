import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/send-otp', AuthController.sendOTP);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/logout', AuthController.logout);

// Example protected route for testing
router.get('/me', protect, (req, res) => {
    res.status(200).json({ status: 'success', data: { user: req.user } });
});

export default router;
