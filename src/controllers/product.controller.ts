import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/product.model';
import { Shop } from '../models/shop.model';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { RecommendationController } from './recommendation.controller';
import { CurrencyService } from '../services/currency.service';

export class ProductController {

    static async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) {
                throw new AppError('Shop not found for this user', 404);
            }

            const { title, price, category, status, moq, bulkPricing, isPersonalizable, personalizationFields, ...otherData } = req.body;

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
                moq: moq || 1,
                bulkPricing,
                isPersonalizable,
                personalizationFields,
                approvalStatus: status === 'submit' ? 'pending' : 'draft',
                isPublished: false // Admin must approve
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

            // Exclude shops in vacation mode
            const vacationShops = await Shop.find({ 'vacationMode.isActive': true }).select('_id');
            const vacationShopIds = vacationShops.map(s => s._id);
            if (vacationShopIds.length > 0) {
                filter.shopId = { ...filter.shopId, $nin: vacationShopIds };
            }

            const skip = (Number(page) - 1) * Number(limit);

            let query = Product.find(filter)
                .populate('category', 'name slug')
                .populate('shopId', 'name slug isVerified');

            // Sorting
            if (sort === 'price-low') query = query.sort('price');
            else if (sort === 'price-high') query = query.sort('-price');
            else query = query.sort('-createdAt');

            const products = await query.skip(skip).limit(Number(limit)).lean();
            const total = await Product.countDocuments(filter);

            const { currency, locale } = req.context;
            const formattedProducts = products.map((p: any) => {
                let displayPrice = CurrencyService.formatPrice(p.price, 'INR', locale);
                if (currency !== 'INR') {
                    const converted = CurrencyService.convertPrice(p.price, currency);
                    displayPrice = CurrencyService.formatPrice(converted, currency, locale);
                }
                return { ...p, displayPrice, currency };
            });

            return ApiResponse.success(res, 200, 'Products fetched successfully', {
                products: formattedProducts,
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

            // Log View Activity (Fire & Forget)
            if (req.user) {
                RecommendationController.logActivity(req.user._id.toString(), product._id.toString(), 'view');
            }

            const { currency, locale } = req.context;
            let displayPrice = CurrencyService.formatPrice(product.price, 'INR', locale);
            let convertedPrice = product.price;

            if (currency !== 'INR') {
                convertedPrice = CurrencyService.convertPrice(product.price, currency);
                displayPrice = CurrencyService.formatPrice(convertedPrice, currency, locale);
            }

            const responseProduct = {
                ...(product.toObject()),
                displayPrice,
                currency
            };

            return ApiResponse.success(res, 200, 'Product details fetched', { product: responseProduct });
        } catch (error) {
            next(error);
        }
    }

    static async getSearchAggregations(req: Request, res: Response, next: NextFunction) {
        try {
            const { search, category } = req.query;
            const matchStage: any = { isPublished: true };

            if (search) {
                matchStage.$text = { $search: search as string };
            }
            if (category) {
                matchStage.category = category;
            }

            // Aggregation Pipeline
            const aggregations = await Product.aggregate([
                { $match: matchStage },
                {
                    $facet: {
                        categories: [
                            { $group: { _id: '$category', count: { $sum: 1 } } },
                            { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'details' } },
                            { $project: { _id: 1, count: 1, name: { $arrayElemAt: ['$details.name', 0] }, slug: { $arrayElemAt: ['$details.slug', 0] } } }
                        ],
                        priceRange: [
                            { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
                        ],
                        // Brands/Shops could be added here
                    }
                }
            ]);

            return ApiResponse.success(res, 200, 'Search aggregations fetched', { aggregations: aggregations[0] });
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

    // Admin: Approve or Reject Product
    static async updateProductStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body; // status: 'approved' | 'rejected'

            if (!['approved', 'rejected'].includes(status)) {
                throw new AppError('Invalid status', 400);
            }

            const product = await Product.findByIdAndUpdate(
                id,
                {
                    approvalStatus: status,
                    isPublished: status === 'approved' // Auto-publish on approval? Or let seller decide? Let's just allow seller to publish now.
                    // Actually, let's keep isPublished separate so seller controls visibility even after approval.
                    // But for simplicity in Phase 4, if approved -> logic usually allows seller to toggle isPublished.
                },
                { new: true }
            );

            if (!product) throw new AppError('Product not found', 404);

            return ApiResponse.success(res, 200, `Product status updated to ${status}`, { product });
        } catch (error) {
            next(error);
        }
    }
}
