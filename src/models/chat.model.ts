import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
    senderId: mongoose.Types.ObjectId;
    receiverId: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    message: string;
    read: boolean;
}

const ChatMessageSchema: Schema = new Schema({
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    message: { type: Schema.Types.ObjectId, required: true },
    read: { type: Boolean, default: false }
}, { timestamps: true });

ChatMessageSchema.index({ senderId: 1, receiverId: 1 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
