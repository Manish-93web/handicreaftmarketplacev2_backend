import { Router } from 'express';
import { AddressController } from '../controllers/address.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', AddressController.getAddresses);
router.post('/', AddressController.createAddress);
router.delete('/:id', AddressController.deleteAddress);

export default router;
