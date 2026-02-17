import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/product.model';
import { Shop } from '../models/shop.model';
import { SellerListing } from '../models/sellerListing.model';
import { RecentlyViewed } from '../models/recentlyViewed.model';
import { BuyBoxService } from '../services/buybox.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import mongoose from 'mongoose';
import { CurrencyService } from '../services/currency.service';

export class ProductController {

    static async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) throw new AppError('Shop not found', 404);

            const {
                title, price, salePrice, stock, sku, category, condition,
                shippingSpeed, status, isPersonalizable, personalizationFields,
                productType, digitalFileUrl, isMadeToOrder, seoTitle, seoDescription,
                ...otherData
            } = req.body;

            // Validate category ID
            if (!mongoose.Types.ObjectId.isValid(category)) {
                throw new AppError('Invalid category ID. Please select a category from the list.', 400);
            }

            const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();

            const finalSeoTitle = seoTitle || `${title} | Premium Handmade ${category}`;
            const finalSeoDescription = seoDescription || `Buy ${title} at the best price. High-quality artisanal work.`;

            const product = await Product.create({
                ...otherData,
                title, category, slug, isPersonalizable, personalizationFields,
                productType: productType || 'simple',
                digitalFileUrl, isMadeToOrder,
                seoTitle: finalSeoTitle, seoDescription: finalSeoDescription,
                approvalStatus: status === 'submit' ? 'pending' : 'draft',
                isPublished: false
            });

            const generatedSku = sku || `${category.toString().slice(-4)}-${title.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

            const listing = await SellerListing.create({
                productId: product._id,
                shopId: shop._id,
                price, salePrice, sku: generatedSku,
                stock: stock || 0,
                stockStatus: (stock > 0) ? 'in_stock' : 'out_of_stock',
                condition: condition || 'new',
                shippingSpeed: shippingSpeed || 'standard',
                isActive: true
            });

            await BuyBoxService.updateBuyBox(product._id.toString());
            return ApiResponse.success(res, 201, 'Product created successfully', { product, listing });
        } catch (error) {
            next(error);
        }
    }

    static async updateProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { title, description, category, images, price, stock, sku, status } = req.body;

            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) throw new AppError('Shop not found', 404);

            const listing = await SellerListing.findOne({ productId: id, shopId: shop._id });
            if (!listing) throw new AppError('Listing not found', 404);

            const productUpdates: any = {};
            if (title) productUpdates.title = title;
            if (description) productUpdates.description = description;
            if (category) productUpdates.category = category;
            if (images) productUpdates.images = images;
            if (status === 'submit') productUpdates.approvalStatus = 'pending';
            else if (status === 'draft') productUpdates.approvalStatus = 'draft';

            const product = await Product.findByIdAndUpdate(id, productUpdates, { new: true });

            const listingUpdates: any = {};
            if (price !== undefined) listingUpdates.price = price;
            if (stock !== undefined) {
                listingUpdates.stock = stock;
                listingUpdates.stockStatus = stock > 0 ? 'in_stock' : 'out_of_stock';
            }
            if (sku) listingUpdates.sku = sku;

            const updatedListing = await SellerListing.findByIdAndUpdate(listing._id, listingUpdates, { new: true });

            return ApiResponse.success(res, 200, 'Product updated', { product, listing: updatedListing });
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

            for (const p of products) {
                const slug = (p.title || 'product').toLowerCase().replace(/ /g, '-') + '-' + Math.random().toString(36).substring(7);
                const product = await Product.create({ ...p, slug, approvalStatus: 'draft', isPublished: false });
                const generatedSku = p.sku || `${p.category?.toString().slice(-4) || 'GEN'}-${p.title?.slice(0, 3).toUpperCase() || 'PRO'}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                await SellerListing.create({
                    productId: product._id, shopId: shop._id, price: p.price, sku: generatedSku,
                    stock: p.stock || 0, stockStatus: (p.stock > 0) ? 'in_stock' : 'out_of_stock', isActive: true
                });
                await BuyBoxService.updateBuyBox(product._id.toString());
            }
            return ApiResponse.success(res, 201, `Imported ${products.length} products`);
        } catch (error) {
            next(error);
        }
    }

    static async getProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                category, search, minPrice, maxPrice, sort, page = 1, limit = 10,
                shopId, material, region, rating, isHandmadeCertified, isVerifiedSeller
            } = req.query;

            const productMatch: any = { isPublished: true, approvalStatus: 'approved' };

            // 1. Basic Filters
            if (category) productMatch.category = new mongoose.Types.ObjectId(category as string);
            if (search) productMatch.$text = { $search: search as string };
            if (material) productMatch.material = { $regex: material as string, $options: 'i' };
            if (region) productMatch.region = { $regex: region as string, $options: 'i' };
            if (isHandmadeCertified === 'true') productMatch.isHandmadeCertified = true;

            // 2. Price Filter (requires aggregation or nested query for listings if using Buy Box)
            // For now, simpler price filter on the product level if it exists, or via Buy Box
            if (minPrice || maxPrice) {
                // This is tricky because price is in SellerListing. 
                // We'll use a subquery to find productIds within price range
                const priceMatch: any = { isActive: true };
                if (minPrice) priceMatch.price = { $gte: Number(minPrice) };
                if (maxPrice) priceMatch.price = { ...priceMatch.price, $lte: Number(maxPrice) };

                const validListings = await SellerListing.find(priceMatch).distinct('productId');
                productMatch._id = { ...(productMatch._id || {}), $in: validListings };
            }

            // 3. Rating Filter
            if (rating) {
                productMatch['ratings.average'] = { $gte: Number(rating) };
            }

            // 4. Shop / Verified Seller Filter
            if (shopId || isVerifiedSeller === 'true') {
                const shopMatch: any = {};
                if (shopId) shopMatch._id = new mongoose.Types.ObjectId(shopId as string);
                if (isVerifiedSeller === 'true') shopMatch.isVerified = true;

                const validShops = await Shop.find(shopMatch).distinct('_id');
                const validListings = await SellerListing.find({ shopId: { $in: validShops }, isActive: true }).distinct('productId');
                productMatch._id = { ...(productMatch._id || {}), $in: validListings };
            }

            // 5. Sorting
            let sortOption: any = { createdAt: -1 }; // Default: Newest
            if (sort === 'price_low') {
                // This requires aggregation for accurate sorting by Buy Box price
                // For simplified MVP, we sort by product's base price if we added it, 
                // but since price is in listings, we'll implement a simple sort or placeholder.
                sortOption = { 'ratings.average': -1 }; // Placeholder: Popularity
            } else if (sort === 'price_high') {
                sortOption = { 'ratings.average': 1 };
            } else if (sort === 'rating') {
                sortOption = { 'ratings.average': -1 };
            } else if (sort === 'newest') {
                sortOption = { createdAt: -1 };
            } else if (sort === 'popularity') {
                sortOption = { 'ratings.count': -1 };
            }

            const skip = (Number(page) - 1) * Number(limit);
            const products = await Product.find(productMatch)
                .sort(sortOption)
                .skip(skip)
                .limit(Number(limit))
                .populate('category');

            const total = await Product.countDocuments(productMatch);

            // Enrich with Buy Box info (Price & Shop)
            const productIds = products.map(p => p._id);
            const winners = await SellerListing.find({
                productId: { $in: productIds },
                isBuyBoxWinner: true,
                isActive: true
            }).populate('shopId', 'name slug logo isVerified');

            const winnerMap = new Map(winners.map(w => [w.productId.toString(), w]));

            const enrichedProducts = products.map(p => {
                const productObj = p.toObject() as any;
                const winner = winnerMap.get(p._id.toString());
                if (winner) {
                    productObj.price = winner.price;
                    productObj.shopId = winner.shopId;
                } else {
                    // Fallback for UI stability
                    productObj.price = productObj.price || 0;
                    productObj.shopId = productObj.shopId || { name: 'Handicraft Artisan' };
                }
                return productObj;
            });

            return ApiResponse.success(res, 200, 'Products fetched', {
                products: enrichedProducts,
                pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
            });
        } catch (error) {
            next(error);
        }
    }

    static async getProductBySlug(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const product = await Product.findOne({ slug, isPublished: true }).populate('category');
            if (!product) throw new AppError('Product not found', 404);

            const listings = await SellerListing.find({ productId: product._id, isActive: true })
                .populate('shopId', 'name logo rating slug isVerified description').sort({ isBuyBoxWinner: -1, price: 1 });

            const productObj = product.toObject() as any;
            const buyBoxListing = listings.find(l => l.isBuyBoxWinner) || listings[0];

            if (buyBoxListing) {
                productObj.buyBoxListing = buyBoxListing;
                productObj.price = buyBoxListing.price;
                productObj.shopId = buyBoxListing.shopId;
            } else {
                productObj.price = 0;
                productObj.shopId = { name: 'Handicraft Artisan' };
            }

            return ApiResponse.success(res, 200, 'Product details fetched', { product: productObj, listings });
        } catch (error) {
            next(error);
        }
    }

    static async trackView(req: Request, res: Response, next: NextFunction) {
        try {
            const { productId } = req.body;
            if (!req.user) return ApiResponse.success(res, 200, 'Guest view ignored');

            let rv = await RecentlyViewed.findOne({ userId: req.user._id });
            if (!rv) rv = new RecentlyViewed({ userId: req.user._id, productIds: [] });

            rv.productIds = [productId, ...rv.productIds.filter(id => id.toString() !== productId)].slice(0, 20);
            await rv.save();
            return ApiResponse.success(res, 200, 'View tracked');
        } catch (error) {
            next(error);
        }
    }

    static async getRecentlyViewed(req: Request, res: Response, next: NextFunction) {
        try {
            const rv = await RecentlyViewed.findOne({ userId: req.user?._id }).populate('productIds');
            return ApiResponse.success(res, 200, 'Recently viewed products', { products: rv?.productIds || [] });
        } catch (error) {
            next(error);
        }
    }

    static async getRelatedProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const product = await Product.findById(id);
            if (!product) throw new AppError('Product not found', 404);

            const related = await Product.find({
                category: product.category, _id: { $ne: product._id },
                approvalStatus: 'approved', isPublished: true
            }).limit(10).populate('category');

            return ApiResponse.success(res, 200, 'Related products', { products: related });
        } catch (error) {
            next(error);
        }
    }

    static async getSuggestions(req: Request, res: Response, next: NextFunction) {
        try {
            const { q } = req.query;
            if (!q) return ApiResponse.success(res, 200, 'Suggestions fetched', { suggestions: [] });
            const suggestions = await Product.find({ title: { $regex: q as string, $options: 'i' }, isPublished: true })
                .limit(5).select('title slug');
            return ApiResponse.success(res, 200, 'Suggestions fetched', { suggestions });
        } catch (error) {
            next(error);
        }
    }

    static async getSearchAggregations(req: Request, res: Response, next: NextFunction) {
        try {
            const { category, search } = req.query;
            const match: any = { isPublished: true, approvalStatus: 'approved' };
            if (category) match.category = new mongoose.Types.ObjectId(category as string);
            if (search) match.$text = { $search: search as string };

            const categories = await Product.aggregate([
                { $match: match },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'details' } },
                { $unwind: '$details' },
                { $project: { name: '$details.name', count: 1 } }
            ]);

            const materials = await Product.aggregate([
                { $match: match },
                { $group: { _id: '$material', count: { $sum: 1 } } },
                { $match: { _id: { $ne: null } } }
            ]);

            const regions = await Product.aggregate([
                { $match: match },
                { $group: { _id: '$region', count: { $sum: 1 } } },
                { $match: { _id: { $ne: null } } }
            ]);

            // Price range aggregation (from SellerListing)
            const productIds = await Product.find(match).distinct('_id');
            const priceStats = await SellerListing.aggregate([
                { $match: { productId: { $in: productIds }, isActive: true } },
                { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' }, avg: { $avg: '$price' } } }
            ]);

            return ApiResponse.success(res, 200, 'Aggregations fetched', {
                categories,
                materials,
                regions,
                priceRange: priceStats[0] || { min: 0, max: 0, avg: 0 }
            });
        } catch (error) {
            next(error);
        }
    }

    static async getMyProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const shop = await Shop.findOne({ sellerId: req.user?._id });
            if (!shop) throw new AppError('Shop not found', 404);

            const listings = await SellerListing.find({ shopId: shop._id }).populate('productId');
            return ApiResponse.success(res, 200, 'My products fetched', { listings });
        } catch (error) {
            next(error);
        }
    }

    static async updateProductStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const product = await Product.findByIdAndUpdate(id, { approvalStatus: status, isPublished: status === 'approved' }, { new: true });
            if (!product) throw new AppError('Product not found', 404);
            return ApiResponse.success(res, 200, `Product status updated to ${status}`, { product });
        } catch (error) {
            next(error);
        }
    }
}
