import { SellerListing, ISellerListing } from '../models/sellerListing.model';
import { Shop } from '../models/shop.model';

export class BuyBoxService {
    /**
     * Calculates and updates the Buy Box winner for a given product.
     * Ranking: Price (40%), Seller Rating (30%), Shipping Speed (20%), Availability (10%).
     */
    static async updateBuyBox(productId: string) {
        const listings = await SellerListing.find({ productId, isActive: true, stock: { $gt: 0 } });
        if (listings.length === 0) return null;

        const shopIds = listings.map(l => l.shopId);
        const shops = await Shop.find({ _id: { $in: shopIds } });
        const shopMap = new Map(shops.map(s => [s._id.toString(), s]));

        const scoredListings = listings.map(listing => {
            const shop = shopMap.get(listing.shopId.toString());
            let score = 0;

            // 1. Price Score (40 points max) - Lower is better.
            // Simplified: (MinPrice / CurrentPrice) * 40
            const minPrice = Math.min(...listings.map(l => l.price));
            score += (minPrice / listing.price) * 40;

            // 2. Seller Rating Score (30 points max)
            const rating = shop?.performanceScore || 0; // Performance score assumed 0-100
            score += (rating / 100) * 30;

            // 3. Shipping Speed Score (20 points max)
            const speedMap = { 'overnight': 20, 'expedited': 15, 'standard': 10 };
            score += speedMap[listing.shippingSpeed as keyof typeof speedMap] || 0;

            // 4. Availability Score (10 points max)
            score += Math.min((listing.stock / 100) * 10, 10);

            return { listing, score };
        });

        // Sort by score descending
        scoredListings.sort((a, b) => b.score - a.score);

        // Reset all listings for this product
        await SellerListing.updateMany({ productId }, { isBuyBoxWinner: false });

        // Update winner
        const winner = scoredListings[0].listing;
        await SellerListing.findByIdAndUpdate(winner._id, { isBuyBoxWinner: true });

        return winner;
    }

    /**
     * Gets the Buy Box winner for a product.
     */
    static async getBuyBoxWinner(productId: string) {
        return await SellerListing.findOne({ productId, isBuyBoxWinner: true, isActive: true })
            .populate('shopId', 'name slug logo isVerified performanceScore');
    }
}
