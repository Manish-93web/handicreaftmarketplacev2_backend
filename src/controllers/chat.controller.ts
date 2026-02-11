import { Request, Response, NextFunction } from 'express';
import { ChatMessage } from '../models/chat.model';
import { ApiResponse } from '../utils/ApiResponse';

export class ChatController {

    static async getChatHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const { otherUserId } = req.params;
            const currentUserId = req.user?._id;

            const messages = await ChatMessage.find({
                $or: [
                    { senderId: currentUserId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: currentUserId }
                ]
            }).sort('createdAt');

            return ApiResponse.success(res, 200, 'Chat history fetched', { messages });
        } catch (error) {
            next(error);
        }
    }

    static async getMyChats(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUserId = req.user?._id;
            if (!currentUserId) return ApiResponse.error(res, 401, 'Unauthorized');

            // Get unique users current user has chatted with
            const messages = await ChatMessage.find({
                $or: [{ senderId: currentUserId }, { receiverId: currentUserId }]
            }).populate('senderId receiverId', 'name avatar');

            const chatPartners = new Map();
            messages.forEach((msg: any) => {
                const partner = msg.senderId._id.toString() === currentUserId.toString()
                    ? msg.receiverId
                    : msg.senderId;
                chatPartners.set(partner._id.toString(), partner);
            });

            return ApiResponse.success(res, 200, 'Chats fetched', {
                chats: Array.from(chatPartners.values())
            });
        } catch (error) {
            next(error);
        }
    }
}
