import mongoose, { Schema, Document } from 'mongoose';

export interface ILegalAgreement extends Document {
    type: 'terms_of_service' | 'privacy_policy' | 'seller_agreement' | 'commission_contract' | 'refund_policy';
    version: string;
    content: string; // Markdown or HTML
    isActive: boolean;
    region?: string;
    publishedAt: Date;
}

const LegalAgreementSchema: Schema = new Schema({
    type: {
        type: String,
        required: true,
        enum: ['terms_of_service', 'privacy_policy', 'seller_agreement', 'commission_contract', 'refund_policy']
    },
    version: { type: String, required: true },
    content: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    region: { type: String, default: 'Global' },
    publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Ensure only one active version per type/region
LegalAgreementSchema.index({ type: 1, region: 1, isActive: 1 });

export const LegalAgreement = mongoose.model<ILegalAgreement>('LegalAgreement', LegalAgreementSchema);

export interface IAgreementAcceptance extends Document {
    userId: mongoose.Types.ObjectId;
    agreementId: mongoose.Types.ObjectId;
    ipAddress: string;
    userAgent: string;
    acceptedAt: Date;
}

const AgreementAcceptanceSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    agreementId: { type: Schema.Types.ObjectId, ref: 'LegalAgreement', required: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    acceptedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const AgreementAcceptance = mongoose.model<IAgreementAcceptance>('AgreementAcceptance', AgreementAcceptanceSchema);
