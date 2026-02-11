import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryLog extends Document {
    productId: mongoose.Types.ObjectId;
    sku: string;
    changeAmount: number; // Negative for reduction, positive for addition
    reason: string; // e.g., "Order Placement", "Restock", "Correction", "Return"
    orderId?: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId; // Performed by
    currentStock: number; // Stock after change
    createdAt: Date;
}

const InventoryLogSchema: Schema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    changeAmount: { type: Number, required: true },
    reason: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    currentStock: { type: Number, required: true }
}, { timestamps: true });

export const InventoryLog = mongoose.model<IInventoryLog>('InventoryLog', InventoryLogSchema);
