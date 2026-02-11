import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    recipientId: mongoose.Types.ObjectId;
    type: 'order_status' | 'promotion' | 'system' | 'alert';
    title: string;
    message: string;
    data?: any; // JSON data for deep linking, e.g., { orderId: '...' }
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: ['order_status', 'promotion', 'system', 'alert'],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false }
}, {
    timestamps: true
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
