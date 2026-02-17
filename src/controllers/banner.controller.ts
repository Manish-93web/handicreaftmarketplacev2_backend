import { Request, Response, NextFunction } from 'express';
import { Banner } from '../models/banner.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class BannerController {
    static async createBanner(req: Request, res: Response, next: NextFunction) {
        try {
            const banner = await Banner.create(req.body);
            return ApiResponse.success(res, 201, 'Banner created successfully', { banner });
        } catch (error) {
            next(error);
        }
    }

    static async getAllBanners(req: Request, res: Response, next: NextFunction) {
        try {
            const banners = await Banner.find().sort('order');
            return ApiResponse.success(res, 200, 'Banners fetched successfully', { banners });
        } catch (error) {
            next(error);
        }
    }

    static async updateBanner(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const banner = await Banner.findByIdAndUpdate(id, req.body, { new: true });
            if (!banner) throw new AppError('Banner not found', 404);
            return ApiResponse.success(res, 200, 'Banner updated successfully', { banner });
        } catch (error) {
            next(error);
        }
    }

    static async deleteBanner(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const banner = await Banner.findByIdAndDelete(id);
            if (!banner) throw new AppError('Banner not found', 404);
            return ApiResponse.success(res, 200, 'Banner deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}
