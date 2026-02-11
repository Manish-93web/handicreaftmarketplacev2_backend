import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    userId?: mongoose.Types.ObjectId;
    action: string;
    resource: string;
    ipAddress: string;
    userAgent: string;
    metadata: any;
    timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
