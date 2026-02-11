import { Request, Response, NextFunction } from 'express';
import Address from '../models/address.model';
import { ApiResponse } from '../utils/ApiResponse';

export class AddressController {

    static async getAddresses(req: Request, res: Response, next: NextFunction) {
        try {
            const addresses = await Address.find({ userId: req.user?._id });
            return ApiResponse.success(res, 200, 'Addresses fetched', { addresses });
        } catch (error) {
            next(error);
        }
    }

    static async createAddress(req: Request, res: Response, next: NextFunction) {
        try {
            const { isDefault, ...data } = req.body;

            if (isDefault) {
                await Address.updateMany({ userId: req.user?._id }, { isDefault: false });
            }

            const address = await Address.create({
                ...data,
                userId: req.user?._id,
                isDefault
            });

            return ApiResponse.success(res, 201, 'Address created', { address });
        } catch (error) {
            next(error);
        }
    }

    static async deleteAddress(req: Request, res: Response, next: NextFunction) {
        try {
            await Address.findOneAndDelete({ _id: req.params.id, userId: req.user?._id });
            return ApiResponse.success(res, 200, 'Address deleted');
        } catch (error) {
            next(error);
        }
    }
}
