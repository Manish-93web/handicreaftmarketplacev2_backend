import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';
import { logAudit } from '../middlewares/audit.middleware';

const router = Router();

router.post('/register', logAudit('user_registration', 'auth'), AuthController.register);
router.post('/register-seller', logAudit('seller_registration', 'auth'), AuthController.registerSeller);
router.post('/login', logAudit('user_login', 'auth'), AuthController.login);
router.post('/send-otp', AuthController.sendOTP);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/google-login', AuthController.googleLogin);
router.post('/refresh-token', logAudit('token_refresh', 'auth'), AuthController.refreshToken);
router.post('/logout', logAudit('user_logout', 'auth'), AuthController.logout);

// Session Management (Protected)
router.get('/sessions', protect, AuthController.getActiveSessions);
router.delete('/sessions/:sessionId', protect, AuthController.logoutFromDevice);
router.post('/logout-all', protect, AuthController.logoutAllDevices);

// Example protected route for testing
router.get('/me', protect, (req, res) => {
    res.status(200).json({ status: 'success', data: { user: req.user } });
});

export default router;
