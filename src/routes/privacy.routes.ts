import { Router } from 'express';
import { PrivacyController } from '../controllers/privacy.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect); // All privacy routes require authentication

router.post('/export', PrivacyController.requestDataExport);
router.post('/delete-account', PrivacyController.requestAccountDeletion);
router.post('/cancel-deletion', PrivacyController.cancelAccountDeletion);
router.patch('/preferences', PrivacyController.updatePrivacyPreferences);

export default router;
