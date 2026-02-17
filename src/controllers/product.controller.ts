import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/product.model';
import { Shop } from '../models/shop.model';
import { SellerListing } from '../models/sellerListing.model';
import { BuyBoxService } from '../services/buybox.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import mongoose from 'mongoose';
import { RecommendationController } from './recommendation.controller';
import { CurrencyService } from '../services/currency.service';

export class ProductController {

    static async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) {
                throw new AppError('Shop not found for this user', 404);
            }

            const {
                title,
                price,
                salePrice,
                stock,
                sku,
                category,
                condition,
                shippingSpeed,
                status,
                isPersonalizable,
                personalizationFields,
                ...otherData
            } = req.body;

            // 1. Create/Find Catalog Product
            // In a real Amazon-scale system, we'd search for existing catalog items first.
            // For now, we'll create a new one to keep logic simple.
            const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();

            const product = await Product.create({
                ...otherData,
                title,
                category,
                slug,
                isPersonalizable,
                personalizationFields,
                approvalStatus: status === 'submit' ? 'pending' : 'draft',
                isPublished: false
            });

            // 2. Create Seller Listing
            const listing = await SellerListing.create({
                productId: product._id,
                shopId: shop._id,
                price,
                salePrice,
                sku: sku || `SKU-${Date.now()}`,
                stock: stock || 0,
                condition: condition || 'new',
                shippingSpeed: shippingSpeed || 'standard',
                isActive: true
            });

            // 3. Update Buy Box (Since it's the first listing, it'll win)
            await BuyBoxService.updateBuyBox(product._id.toString());

            return ApiResponse.success(res, 201, 'Product and Listing created successfully', { product, listing });
        } catch (error) {
            next(error);
        }
    }

    static async updateProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) throw new AppError('Shop not found', 404);

            // Find the listing to ensure ownership
            const listing = await SellerListing.findOne({ productId: id, shopId: shop._id });
            if (!listing) throw new AppError('Product not found in your shop', 404);

            const {
                title,
                price,
                stock,
                sku,
                category,
                status, // 'draft' or 'submit'
                images,
                description
            } = req.body;

            // Update Product
            const productUpdates: any = {};
            if (title) productUpdates.title = title;
            if (description) productUpdates.description = description;
            if (category) productUpdates.category = category;
            if (images) productUpdates.images = images;

            // If status is provided, update approval status
            if (status === 'submit') {
                productUpdates.approvalStatus = 'pending';
            } else if (status === 'draft') {
                productUpdates.approvalStatus = 'draft';
            }

            const product = await Product.findByIdAndUpdate(id, productUpdates, { new: true });

            // Update Listing
            const listingUpdates: any = {};
            if (price !== undefined) listingUpdates.price = price;
            if (stock !== undefined) listingUpdates.stock = stock;
            if (sku) listingUpdates.sku = sku;

            const updatedListing = await SellerListing.findByIdAndUpdate(listing._id, listingUpdates, { new: true });

            return ApiResponse.success(res, 200, 'Product updated successfully', { product, listing: updatedListing });
        } catch (error) {
            next(error);
        }
    }

    static async bulkImportProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) throw new AppError('Shop not found', 404);

            const { products } = req.body;
            if (!Array.isArray(products)) throw new AppError('Invalid products data', 400);

            const results = [];
            for (const p of products) {
                const slug = (p.title || 'product').toLowerCase().replace(/ /g, '-') + '-' + Math.random().toString(36).substring(7);

                const product = await Product.create({
                    ...p,
                    slug,
                    approvalStatus: 'draft',
                    isPublished: false
                });

                const listing = await SellerListing.create({
                    productId: product._id,
                    shopId: shop._id,
                    price: p.price,
                    sku: p.sku || `SKU-${Date.now()}`,
                    stock: p.stock || 0,
                    isActive: true
                });

                await BuyBoxService.updateBuyBox(product._id.toString());
                results.push({ product, listing });
            }

            return ApiResponse.success(res, 201, `Imported ${results.length} products with listings`, { count: results.length });
        } catch (error) {
            next(error);
        }
    }

    static async getProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const { category, search, minPrice, maxPrice, sort, page = 1, limit = 10, shopId } = req.query;

            // Build Match Stage for Product
            const productMatch: any = { isPublished: true };
            if (category) productMatch.category = new mongoose.Types.ObjectId(category as string);
            if (search) productMatch.$text = { $search: search as string };

            // Special handling for shopId: Filter listings first to get Product IDs
            let productIdsFromShop: mongoose.Types.ObjectId[] | null = null;
            if (shopId) {
                if (!mongoose.isValidObjectId(shopId)) {
                    return ApiResponse.success(res, 200, 'Invalid Shop ID', { products: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } });
                }
                const shopListings = await SellerListing.find({
                    shopId: new mongoose.Types.ObjectId(shopId as string),
                    isActive: true,
                    stock: { $gt: 0 }
                }).select('productId');

                productIdsFromShop = shopListings.map(l => l.productId);

                if (productIdsFromShop.length === 0) {
                    return ApiResponse.success(res, 200, 'No products found for this shop', { products: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } });
                }
                productMatch._id = { $in: productIdsFromShop };
            }

            // Listing match query
            const listingMatch: any = {
                $expr: { $eq: ['$productId', '$$productId'] },
                isActive: true,
                stock: { $gt: 0 }
            };
            // shopId filtering is now done via productMatch._id

            const pipeline: any[] = [
                { $match: productMatch },
                {
                    $lookup: {
                        from: 'sellerlistings',
                        let: { productId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $and: [
                                        { $expr: { $eq: ['$productId', '$$productId'] } },
                                        { isActive: true },
                                        { stock: { $gt: 0 } },
                                        // If shopId is provided, we MUST only join with that shop's listing
                                        // to ensure we show the price/stock defined by THAT shop.
                                        ...(shopId ? [{ shopId: new mongoose.Types.ObjectId(shopId as string) }] : [])
                                    ]
                                }
                            },
                            { $sort: { isBuyBoxWinner: -1, price: 1 } },
                            { $limit: 1 }
                        ],
                        as: 'buyBoxListing'
                    }
                },
                { $unwind: { path: '$buyBoxListing', preserveNullAndEmptyArrays: false } },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'category',
                        foreignField: '_id',
                        as: 'categoryInfo'
                    }
                },
                { $unwind: '$categoryInfo' }
            ];

            // Filter by Price (from listing)
            if (minPrice || maxPrice) {
                const priceMatch: any = {};
                if (minPrice) priceMatch['buyBoxListing.price'] = { $gte: Number(minPrice) };
                if (maxPrice) priceMatch['buyBoxListing.price'] = { ...priceMatch['buyBoxListing.price'], $lte: Number(maxPrice) };
                pipeline.push({ $match: priceMatch });
            }

            // Sorting
            if (sort === 'price-low') pipeline.push({ $sort: { 'buyBoxListing.price': 1 } });
            else if (sort === 'price-high') pipeline.push({ $sort: { 'buyBoxListing.price': -1 } });
            else pipeline.push({ $sort: { createdAt: -1 } });

            // Pagination
            const skip = (Number(page) - 1) * Number(limit);
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: Number(limit) });

            const products = await Product.aggregate(pipeline);
            const total = await Product.countDocuments(productMatch);

            const { currency, locale } = req.context;
            const formattedProducts = products.map((p: any) => {
                const price = p.buyBoxListing.price;
                let displayPrice = CurrencyService.formatPrice(price, 'INR', locale);
                if (currency !== 'INR') {
                    const converted = CurrencyService.convertPrice(price, currency);
                    displayPrice = CurrencyService.formatPrice(converted, currency, locale);
                }
                return {
                    ...p,
                    price,
                    displayPrice,
                    currency,
                    shopId: p.buyBoxListing.shopId
                };
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
            console.error('Error in getProducts:', error);
            next(error);
        }
    }

    static async getProductBySlug(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const product = await Product.findOne({ slug, isPublished: true })
                .populate('category', 'name slug');

            if (!product) {
                throw new AppError('Product not found', 404);
            }

            // Fetch all listings for this product
            const listings = await SellerListing.find({ productId: product._id, isActive: true })
                .populate('shopId', 'name slug logo description isVerified performanceScore')
                .sort({ isBuyBoxWinner: -1, price: 1 });

            const buyBoxListing = listings.find(l => l.isBuyBoxWinner) || listings[0];

            if (req.user) {
                RecommendationController.logActivity(req.user._id.toString(), product._id.toString(), 'view');
            }

            const { currency, locale } = req.context;
            const price = buyBoxListing?.price || 0;
            let displayPrice = CurrencyService.formatPrice(price, 'INR', locale);

            if (currency !== 'INR' && price > 0) {
                const converted = CurrencyService.convertPrice(price, currency);
                displayPrice = CurrencyService.formatPrice(converted, currency, locale);
            }

            const responseProduct = {
                ...(product.toObject()),
                price,
                displayPrice,
                currency,
                listings,
                buyBoxListing
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

            // In the new model, "My Products" are my Listings
            const listings = await SellerListing.find({ shopId: shop._id })
                .populate('productId')
                .sort('-createdAt');

            // Help frontend by also providing a direct products list
            const products = listings.map(l => ({
                ...(l.productId as any).toObject(),
                listing: {
                    _id: l._id,
                    price: l.price,
                    stock: l.stock,
                    isActive: l.isActive
                }
            }));

            return ApiResponse.success(res, 200, 'My products fetched', { listings, products });
        } catch (error) {
            next(error);
        }
    }

    static async getSuggestions(req: Request, res: Response, next: NextFunction) {
        try {
            const { q } = req.query;
            if (!q || (q as string).length < 2) {
                return ApiResponse.success(res, 200, 'Suggestions', { suggestions: [] });
            }

            const query = q as string;

            // Search Products, Categories, and maybe Shops
            const products = await Product.find({
                title: { $regex: query, $options: 'i' },
                isPublished: true
            }).limit(5).select('title slug');

            const categories = await mongoose.model('Category').find({
                name: { $regex: query, $options: 'i' }
            }).limit(3).select('name slug');

            const suggestions = [
                ...products.map(p => ({ type: 'product', text: p.title, slug: p.slug })),
                ...categories.map(c => ({ type: 'category', text: c.name, slug: c.slug }))
            ];

            return ApiResponse.success(res, 200, 'Suggestions fetched', { suggestions });
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
                { returnDocument: 'after' }
            );

            if (!product) throw new AppError('Product not found', 404);

            return ApiResponse.success(res, 200, `Product status updated to ${status}`, { product });
        } catch (error) {
            next(error);
        }
    }
}
