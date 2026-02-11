import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.get('/history/:otherUserId', ChatController.getChatHistory);
router.get('/my-chats', ChatController.getMyChats);

export default router;
