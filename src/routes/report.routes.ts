import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.post('/', ReportController.createReport); // Any auth user can report
router.get('/', restrictTo('admin'), ReportController.getAllReports);
router.patch('/:id/resolve', restrictTo('admin'), ReportController.resolveReport);

export default router;
