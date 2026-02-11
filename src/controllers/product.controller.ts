import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/product.model';
import { Shop } from '../models/shop.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export class ProductController {

    static async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) {
                throw new AppError('Shop not found for this user', 404);
            }

            const { title, price, category, status, ...otherData } = req.body;

            // Auto-generate slug
            const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();

            // Auto-generate SKU if not provided
            const sku = req.body.sku || `SKU-${Date.now()}`;

            const product = await Product.create({
                ...otherData,
                title,
                price,
                category,
                shopId: shop._id,
                slug,
                sku,
                approvalStatus: status === 'submit' ? 'pending' : 'draft',
                isPublished: status === 'submit' ? false : false // Admin must approve
            });

            return ApiResponse.success(res, 201, 'Product created successfully', { product });
        } catch (error) {
            next(error);
        }
    }

    static async bulkImportProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) throw new AppError('Shop not found', 404);

            const { products } = req.body; // Expecting array of product objects
            if (!Array.isArray(products)) throw new AppError('Invalid products data', 400);

            const count = products.length;
            const importedProducts = products.map(p => ({
                ...p,
                shopId: shop._id,
                slug: (p.title || 'product').toLowerCase().replace(/ /g, '-') + '-' + Math.random().toString(36).substring(7),
                sku: p.sku || `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`,
                approvalStatus: 'draft'
            }));

            await Product.insertMany(importedProducts);

            return ApiResponse.success(res, 201, `Imported ${count} products as drafts`, { count });
        } catch (error) {
            next(error);
        }
    }

    static async getProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const { shopId, category, search, minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;
            const filter: any = { isPublished: true };

            if (shopId) filter.shopId = shopId;
            if (category) filter.category = category;
            if (search) {
                filter.$text = { $search: search as string };
            }
            if (minPrice || maxPrice) {
                filter.price = {};
                if (minPrice) filter.price.$gte = Number(minPrice);
                if (maxPrice) filter.price.$lte = Number(maxPrice);
            }

            const skip = (Number(page) - 1) * Number(limit);

            let query = Product.find(filter)
                .populate('category', 'name slug')
                .populate('shopId', 'name slug isVerified');

            // Sorting
            if (sort === 'price-low') query = query.sort('price');
            else if (sort === 'price-high') query = query.sort('-price');
            else query = query.sort('-createdAt');

            const products = await query.skip(skip).limit(Number(limit));
            const total = await Product.countDocuments(filter);

            return ApiResponse.success(res, 200, 'Products fetched successfully', {
                products,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async getProductBySlug(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const product = await Product.findOne({ slug, isPublished: true })
                .populate('category', 'name slug')
                .populate('shopId', 'name slug description logo banner isVerified');

            if (!product) {
                throw new AppError('Product not found', 404);
            }

            return ApiResponse.success(res, 200, 'Product details fetched', { product });
        } catch (error) {
            next(error);
        }
    }

    static async getMyProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) {
                throw new AppError('Shop not found', 404);
            }
            const products = await Product.find({ shopId: shop._id }).sort('-createdAt');
            return ApiResponse.success(res, 200, 'My products fetched', { products });
        } catch (error) {
            next(error);
        }
    }
}
