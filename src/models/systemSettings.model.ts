import { Schema, model, Document } from 'mongoose';

export interface ISystemSettings extends Document {
    commissionRate: number; // in percentage, e.g., 10
    minPayoutAmount: number;
    platformFee: number;
    lastUpdatedBy: Schema.Types.ObjectId;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
    commissionRate: { type: Number, default: 10 },
    minPayoutAmount: { type: Number, default: 500 },
    platformFee: { type: Number, default: 0 },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const SystemSettings = model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
