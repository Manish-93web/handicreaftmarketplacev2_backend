import { Request, Response, NextFunction } from 'express';
import { LegalAgreement, AgreementAcceptance } from '../models/legalAgreement.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class LegalController {
    // Get the latest active agreement by type
    static async getLatestAgreement(req: Request, res: Response, next: NextFunction) {
        try {
            const { type } = req.params;
            const { region = 'Global' } = req.query;

            const agreement = await LegalAgreement.findOne({
                type: type as any,
                region: region as string,
                isActive: true
            }).sort({ version: -1 });

            if (!agreement) {
                throw new AppError(`No active agreement found for type: ${type}`, 404);
            }

            return ApiResponse.success(res, 200, 'Agreement fetched', { agreement });
        } catch (error) {
            next(error);
        }
    }

    // Accept an agreement
    static async acceptAgreement(req: Request, res: Response, next: NextFunction) {
        try {
            const { agreementId } = req.body;

            const agreement = await LegalAgreement.findById(agreementId);
            if (!agreement) {
                throw new AppError('Agreement not found', 404);
            }

            const acceptance = await AgreementAcceptance.create({
                userId: req.user?._id,
                agreementId,
                ipAddress: req.ip || '',
                userAgent: req.headers['user-agent'] || 'unknown'
            });

            return ApiResponse.success(res, 201, 'Agreement accepted successfully', { acceptance });
        } catch (error) {
            next(error);
        }
    }

    // Admin: Create a new agreement version
    static async createAgreement(req: Request, res: Response, next: NextFunction) {
        try {
            const { type, version, content, region } = req.body;

            // Deactivate old active version of same type/region
            await LegalAgreement.updateMany(
                { type, region: region || 'Global', isActive: true },
                { isActive: false }
            );

            const agreement = await LegalAgreement.create({
                type,
                version,
                content,
                region: region || 'Global',
                isActive: true
            });

            return ApiResponse.success(res, 201, 'New agreement version created', { agreement });
        } catch (error) {
            next(error);
        }
    }
}
