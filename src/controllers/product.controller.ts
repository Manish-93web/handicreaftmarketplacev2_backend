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
            const { category, search, minPrice, maxPrice, sort, page = 1, limit = 10, shopId } = req.query;
            const productMatch: any = { isPublished: true, approvalStatus: 'approved' };
            if (category) productMatch.category = new mongoose.Types.ObjectId(category as string);
            if (search) productMatch.$text = { $search: search as string };

            if (shopId) {
                const shopListings = await SellerListing.find({ shopId: new mongoose.Types.ObjectId(shopId as string), isActive: true });
                productMatch._id = { $in: shopListings.map(l => l.productId) };
            }

            const skip = (Number(page) - 1) * Number(limit);
            const products = await Product.find(productMatch).skip(skip).limit(Number(limit)).populate('category');
            const total = await Product.countDocuments(productMatch);

            return ApiResponse.success(res, 200, 'Products fetched', {
                products,
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
                .populate('shopId', 'name logo rating').sort({ isBuyBoxWinner: -1, price: 1 });

            return ApiResponse.success(res, 200, 'Product details fetched', { product, listings });
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
            const { category } = req.query;
            const match: any = { isPublished: true, approvalStatus: 'approved' };
            if (category) match.category = new mongoose.Types.ObjectId(category as string);

            const categories = await Product.aggregate([
                { $match: { isPublished: true, approvalStatus: 'approved' } },
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ]);

            return ApiResponse.success(res, 200, 'Aggregations fetched', { categories });
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
