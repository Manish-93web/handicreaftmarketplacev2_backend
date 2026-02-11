import { Router } from 'express';
import { LegalController } from '../controllers/legal.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Public: Get latest policies
router.get('/:type', LegalController.getLatestAgreement);

// Protected: Accept an agreement
router.post('/accept', protect, LegalController.acceptAgreement);

// Admin Only: Create new versions
router.post('/admin/create', protect, restrictTo('admin'), LegalController.createAgreement);

export default router;
