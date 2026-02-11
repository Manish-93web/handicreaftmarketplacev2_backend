import { Request, Response } from 'express';
import { Category } from '../models/category.model';
import { ApiResponse } from '../utils/ApiResponse';

export class SeedController {
    static async seedCategories(req: Request, res: Response) {
        try {
            const categories = [
                { name: 'Home Decor', slug: 'home-decor', description: 'Beautiful items for your home' },
                { name: 'Jewelry', slug: 'jewelry', description: 'Handmade necklaces, rings, and more' },
                { name: 'Clothing', slug: 'clothing', description: 'Traditional and modern wear' },
                { name: 'Art & Collectibles', slug: 'art-collectibles', description: 'Paintings, sculptures, and rare finds' },
                { name: 'Pottery', slug: 'pottery', description: 'Clay pots, vases, and dishes' },
            ];

            await Category.deleteMany({}); // Clear existing
            const created = await Category.insertMany(categories);

            return ApiResponse.success(res, 201, 'Categories seeded successfully', { created });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
