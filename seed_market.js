const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://mkmanishkumar7366_db_user:handiCraft%40123@cluster0.ppwmtvb.mongodb.net/HandiCraftMarketPlace==Cluster0';

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        // IDs from products.ts
        const catId1 = new mongoose.Types.ObjectId('65cf1234bcf86cd799439101');
        const shopId1 = new mongoose.Types.ObjectId('65cf1234bcf86cd799439001');
        const prodId1 = new mongoose.Types.ObjectId('65cf1234bcf86cd799439201');
        const sellerId1 = new mongoose.Types.ObjectId('65cf1234bcf86cd799439a01');

        const catId2 = new mongoose.Types.ObjectId('65cf1234bcf86cd799439102');
        const shopId2 = new mongoose.Types.ObjectId('65cf1234bcf86cd799439002');
        const prodId2 = new mongoose.Types.ObjectId('65cf1234bcf86cd799439202');
        const sellerId2 = new mongoose.Types.ObjectId('65cf1234bcf86cd799439a02');

        console.log('Dropping collections...');
        try { await db.collection('categories').drop(); } catch (e) { }
        try { await db.collection('shops').drop(); } catch (e) { }
        try { await db.collection('products').drop(); } catch (e) { }
        try { await db.collection('sellerlistings').drop(); } catch (e) { }

        console.log('Inserting categories...');
        await db.collection('categories').insertMany([
            { _id: catId1, name: 'Pottery', slug: 'pottery', description: 'Clay items' },
            { _id: catId2, name: 'Kitchen & Dining', slug: 'kitchen-dining', description: 'Kitchen ware' }
        ]);

        console.log('Inserting shops...');
        await db.collection('shops').insertMany([
            { _id: shopId1, sellerId: sellerId1, name: 'Earth & Clay', slug: 'earth-clay', performanceScore: 95, isActive: true, isVerified: true, kycStatus: 'approved' },
            { _id: shopId2, sellerId: sellerId2, name: 'Royal Jaipur Crafts', slug: 'royal-jaipur-crafts', performanceScore: 98, isActive: true, isVerified: true, kycStatus: 'approved' }
        ]);

        console.log('Inserting products...');
        await db.collection('products').insertMany([
            { _id: prodId1, title: 'Handcrafted Terracotta Vase', slug: 'handcrafted-terracotta-vase', price: 1250, category: catId1, shopId: shopId1, isActive: true },
            { _id: prodId2, title: 'Blue Pottery Serving Bowl', slug: 'blue-pottery-serving-bowl', price: 850, category: catId2, shopId: shopId2, isActive: true }
        ]);

        console.log('Inserting listings...');
        const listingId1 = new mongoose.Types.ObjectId('65cf1234bcf86cd799439301');
        const listingId2 = new mongoose.Types.ObjectId('65cf1234bcf86cd799439302');

        await db.collection('sellerlistings').insertMany([
            { _id: listingId1, productId: prodId1, shopId: shopId1, price: 1250, stock: 15, isActive: true, isBuyBoxWinner: true, shippingSpeed: 'standard', sku: 'SKU-VASE-001' },
            { _id: listingId2, productId: prodId2, shopId: shopId2, price: 850, stock: 8, isActive: true, isBuyBoxWinner: true, shippingSpeed: 'expedited', sku: 'SKU-BOWL-002' }
        ]);

        console.log('Seed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

seed();
