const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://mkmanishkumar7366_db_user:handiCraft%40123@cluster0.ppwmtvb.mongodb.net/HandiCraftMarketPlace==Cluster0';

const products = [
    {
        _id: "65cf1234bcf86cd799439201",
        title: "Handcrafted Terracotta Vase",
        slug: "handcrafted-terracotta-vase",
        price: 1250,
        description: "Authentic handmade terracotta vase with intricate tribal patterns. Perfect for living room decor.",
        category: { _id: "65cf1234bcf86cd799439101", name: "Pottery" },
        shopId: { _id: "65cf1234bcf86cd799439001", name: "Earth & Clay" },
        images: ["/products/IMG-20251120-WA0027.jpg"],
        stock: 15
    },
    {
        _id: "65cf1234bcf86cd799439202",
        title: "Blue Pottery Serving Bowl",
        slug: "blue-pottery-serving-bowl",
        price: 850,
        description: "Traditional Jaipur blue pottery serving bowl. Lead-free and microwave safe.",
        category: { _id: "65cf1234bcf86cd799439102", name: "Kitchen & Dining" },
        shopId: { _id: "65cf1234bcf86cd799439002", name: "Royal Jaipur Crafts" },
        images: ["/products/IMG-20251120-WA0028.jpg"],
        stock: 8
    },
    {
        _id: "65cf1234bcf86cd799439203",
        title: "Woven Bamboo Basket",
        slug: "woven-bamboo-basket",
        price: 450,
        description: "Eco-friendly bamboo storage basket woven by artisans from Northeast India.",
        category: { _id: "65cf1234bcf86cd799439103", name: "Home Decor" },
        shopId: { _id: "65cf1234bcf86cd799439003", name: "Green Weaves" },
        images: ["/products/IMG-20251120-WA0029.jpg"],
        stock: 20
    },
    {
        _id: "65cf1234bcf86cd799439204",
        title: "Hand-painted Wooden Coasters",
        slug: "hand-painted-wooden-coasters",
        price: 350,
        description: "Set of 6 wooden coasters featuring Warli art painting.",
        category: { _id: "65cf1234bcf86cd799439104", name: "Kitchen & Dining" },
        shopId: { _id: "65cf1234bcf86cd799439004", name: "Wooden Wonders" },
        images: ["/products/IMG-20251120-WA0030.jpg"],
        stock: 50
    },
    {
        _id: "65cf1234bcf86cd799439205",
        title: "Embroidered Wall Hanging",
        slug: "embroidered-wall-hanging",
        price: 1500,
        description: "Vibrant Kutch embroidery wall hanging to add a splash of color to your walls.",
        category: { _id: "65cf1234bcf86cd799439105", name: "Home Decor" },
        shopId: { _id: "65cf1234bcf86cd799439005", name: "Kutch Creations" },
        images: ["/products/IMG-20251120-WA0031.jpg"],
        stock: 5
    },
    {
        _id: "65cf1234bcf86cd799439206",
        title: "Brass Oil Lamp (Diya)",
        slug: "brass-oil-lamp-diya",
        price: 650,
        description: "Traditional brass diya for puja and home decoration. Hand-polished finish.",
        category: { _id: "65cf1234bcf86cd799439105", name: "Home Decor" },
        shopId: { _id: "65cf1234bcf86cd799439006", name: "Divine Brass" },
        images: ["/products/IMG-20251120-WA0032.jpg"],
        stock: 25
    },
    {
        _id: "65cf1234bcf86cd799439207",
        title: "Jute Tote Bag with Tassels",
        slug: "jute-tote-bag-tassels",
        price: 550,
        description: "Stylish and sustainable jute tote bag with colorful tassels. multipurpose use.",
        category: { _id: "65cf1234bcf86cd799439106", name: "Bags" },
        shopId: { _id: "65cf1234bcf86cd799439007", name: "Green Weaves" },
        images: ["/products/IMG-20251120-WA0033.jpg"],
        stock: 12
    },
    {
        _id: "65cf1234bcf86cd799439208",
        title: "Hand-carved Wooden Elephant",
        slug: "hand-carved-wooden-elephant",
        price: 2200,
        description: "Exquisite sandalwood carved elephant statue. A masterpiece of craftsmanship.",
        category: { _id: "65cf1234bcf86cd799439105", name: "Home Decor" },
        shopId: { _id: "65cf1234bcf86cd799439008", name: "Wooden Wonders" },
        images: ["/products/IMG-20251120-WA0034.jpg"],
        stock: 3
    },
    {
        _id: "65cf1234bcf86cd799439209",
        title: "Kalamkari Print Table Runner",
        slug: "kalamkari-print-table-runner",
        price: 950,
        description: "Cotton table runner with authentic Kalamkari block print.",
        category: { _id: "65cf1234bcf86cd799439102", name: "Kitchen & Dining" },
        shopId: { _id: "65cf1234bcf86cd799439009", name: "Andhra Arts" },
        images: ["/products/IMG-20251120-WA0035.jpg"],
        stock: 10
    },
    {
        _id: "65cf1234bcf86cd799439210",
        title: "Silver Oxidized Necklace",
        slug: "silver-oxidized-necklace",
        price: 1800,
        description: "Bohemian style silver oxidized necklace with intricate detailing.",
        category: { _id: "65cf1234bcf86cd799439107", name: "Jewelry" },
        shopId: { _id: "65cf1234bcf86cd799439010", name: "Tribal Ornaments" },
        images: ["/products/IMG-20251120-WA0036.jpg"],
        stock: 15
    },
    {
        _id: "65cf1234bcf86cd799439211",
        title: "Madhubani Painting on Canvas",
        slug: "madhubani-painting-canvas",
        price: 3500,
        description: "Original Madhubani painting depicting nature scenes. Acrylic on canvas.",
        category: { _id: "65cf1234bcf86cd799439111", name: "Paintings" },
        shopId: { _id: "65cf1234bcf86cd799439011", name: "Mithila Art" },
        images: ["/products/IMG-20251120-WA0037.jpg"],
        stock: 1
    },
    {
        _id: "65cf1234bcf86cd799439212",
        title: "Block Print Cotton Scarf",
        slug: "block-print-cotton-scarf",
        price: 450,
        description: "Soft cotton scarf with Indigo block print. Breathable and comfortable.",
        category: { _id: "65cf1234bcf86cd799439112", name: "Clothing" },
        shopId: { _id: "65cf1234bcf86cd799439012", name: "Royal Jaipur Crafts" },
        images: ["/products/IMG-20251120-WA0038.jpg"],
        stock: 30
    },
    {
        _id: "65cf1234bcf86cd799439213",
        title: "Copper Water Bottle",
        slug: "copper-water-bottle",
        price: 1100,
        description: "Pure hammered copper water bottle for health benefits.",
        category: { _id: "65cf1234bcf86cd799439113", name: "Kitchen & Dining" },
        shopId: { _id: "65cf1234bcf86cd799439013", name: "Divine Brass" },
        images: ["/products/IMG-20251120-WA0039.jpg"],
        stock: 18
    },
    {
        _id: "65cf1234bcf86cd799439214",
        title: "Banana Fiber Placemats (Set of 4)",
        slug: "banana-fiber-placemats",
        price: 700,
        description: "Sustainable placemats made from banana fiber. Heat resistant.",
        category: { _id: "65cf1234bcf86cd799439114", name: "Kitchen & Dining" },
        shopId: { _id: "65cf1234bcf86cd799439014", name: "Green Weaves" },
        images: ["/products/IMG-20251120-WA0040.jpg"],
        stock: 22
    },
    {
        _id: "65cf1234bcf86cd799439215",
        title: "Dhokra Art Figurine",
        slug: "dhokra-art-figurine",
        price: 1600,
        description: "Ancient Dhokra metal casting figurine. Tribal art piece.",
        category: { _id: "65cf1234bcf86cd799439115", name: "Home Decor" },
        shopId: { _id: "65cf1234bcf86cd799439015", name: "Tribal Casting" },
        images: ["/products/IMG-20251120-WA0041.jpg"],
        stock: 4
    },
    {
        _id: "65cf1234bcf86cd799439216",
        title: "Leather Juttis",
        slug: "leather-juttis",
        price: 1450,
        description: "Handcrafted traditional leather juttis with embroidery.",
        category: { _id: "65cf1234bcf86cd799439116", name: "Footwear" },
        shopId: { _id: "65cf1234bcf86cd799439016", name: "Punjabi Jutti House" },
        images: ["/products/IMG-20251120-WA0042.jpg"],
        stock: 10
    },
    {
        _id: "65cf1234bcf86cd799439217",
        title: "Pattachitra Painted Bookmark",
        slug: "pattachitra-bookmark",
        price: 150,
        description: "Palm leaf bookmark with delicate Pattachitra painting.",
        category: { _id: "65cf1234bcf86cd799439117", name: "Stationery" },
        shopId: { _id: "65cf1234bcf86cd799439017", name: "Orissa Crafts" },
        images: ["/products/IMG-20251120-WA0043.jpg"],
        stock: 100
    },
    {
        _id: "65cf1234bcf86cd799439218",
        title: "Coconut Shell Candle",
        slug: "coconut-shell-candle",
        price: 300,
        description: "Soy wax candle poured in a reclaimed coconut shell. Coconut vanilla scent.",
        category: { _id: "65cf1234bcf86cd799439115", name: "Home Decor" },
        shopId: { _id: "65cf1234bcf86cd799439018", name: "Coco Lights" },
        images: ["/products/IMG-20251120-WA0044.jpg"],
        stock: 40
    },
    {
        _id: "65cf1234bcf86cd799439219",
        title: "Kashmir Papier Mache Box",
        slug: "kashmir-papier-mache-box",
        price: 800,
        description: "Beautifully hand-painted papier mache box from Kashmir for jewelry storage.",
        category: { _id: "65cf1234bcf86cd799439115", name: "Home Decor" },
        shopId: { _id: "65cf1234bcf86cd799439019", name: "Valley Arts" },
        images: ["/products/IMG-20251120-WA0045.jpg"],
        stock: 7
    },
    {
        _id: "65cf1234bcf86cd799439220",
        title: "Beaded Toran",
        slug: "beaded-toran",
        price: 550,
        description: "Colorful beaded toran for door hanging. Auspicious and decorative.",
        category: { _id: "65cf1234bcf86cd799439115", name: "Home Decor" },
        shopId: { _id: "65cf1234bcf86cd799439020", name: "Gujarati Crafts" },
        images: ["/products/IMG-20251120-WA0046.jpg"],
        stock: 14
    },
    {
        _id: "65cf1234bcf86cd799439221",
        title: "Marble Roti Chakla",
        slug: "marble-roti-chakla",
        price: 900,
        description: "Heavy white marble chakla for making perfect rotis.",
        category: { _id: "65cf1234bcf86cd799439113", name: "Kitchen & Dining" },
        shopId: { _id: "65cf1234bcf86cd799439021", name: "Agra Stones" },
        images: ["/products/IMG-20251120-WA0047.jpg"],
        stock: 6
    },
    {
        _id: "65cf1234bcf86cd799439222",
        title: "Phulkari Dupatta",
        slug: "phulkari-dupatta",
        price: 2100,
        description: "Heavy hand-embroidered Phulkari dupatta in vibrant colors.",
        category: { _id: "65cf1234bcf86cd799439112", name: "Clothing" },
        shopId: { _id: "65cf1234bcf86cd799439022", name: "Punjabi Jutti House" },
        images: ["/products/IMG-20251120-WA0048.jpg"],
        stock: 5
    },
    {
        _id: "65cf1234bcf86cd799439223",
        title: "Macrame Wall Shelf",
        slug: "macrame-wall-shelf",
        price: 1100,
        description: "Boho style macrame wall shelf for plants and books.",
        category: { _id: "65cf1234bcf86cd799439115", name: "Home Decor" },
        shopId: { _id: "65cf1234bcf86cd799439023", name: "Knotty Crafts" },
        images: ["/products/IMG-20251120-WA0049.jpg"],
        stock: 12
    },
    {
        _id: "65cf1234bcf86cd799439224",
        title: "Sabai Grass Bread Basket",
        slug: "sabai-grass-bread-basket",
        price: 400,
        description: "Natural Sabai grass woven basket. Perfect for serving bread.",
        category: { _id: "65cf1234bcf86cd799439114", name: "Kitchen & Dining" },
        shopId: { _id: "65cf1234bcf86cd799439024", name: "Orissa Crafts" },
        images: ["/products/IMG-20251120-WA0050.jpg"],
        stock: 25
    },
    {
        _id: "65cf1234bcf86cd799439225",
        title: "Blue Pottery Soap Dispenser",
        slug: "blue-pottery-soap-dispenser",
        price: 600,
        description: "Ceramic hand-painted soap dispenser for bathroom vanity.",
        category: { _id: "65cf1234bcf86cd799439118", name: "Bath" },
        shopId: { _id: "65cf1234bcf86cd799439025", name: "Royal Jaipur Crafts" },
        images: ["/products/IMG-20251120-WA0051.jpg"],
        stock: 16
    },
    {
        _id: "65cf1234bcf86cd799439226",
        title: "Kantha Quilt (Single)",
        slug: "kantha-quilt-single",
        price: 2800,
        description: "Vintage sari patchwork Kantha quilt. Lightweight and cozy.",
        category: { _id: "65cf1234bcf86cd799439119", name: "Bedding" },
        shopId: { _id: "65cf1234bcf86cd799439026", name: "Bengal Weavers" },
        images: ["/products/IMG-20251120-WA0052.jpg"],
        stock: 3
    },
    {
        _id: "65cf1234bcf86cd799439227",
        title: "Gond Art Tray",
        slug: "gond-art-tray",
        price: 750,
        description: "Wooden serving tray with Gond tribal art motifs.",
        category: { _id: "65cf1234bcf86cd799439114", name: "Kitchen & Dining" },
        shopId: { _id: "65cf1234bcf86cd799439027", name: "Tribal Trays" },
        images: ["/products/WhatsApp Image 2025-11-20 at 15.58.39_ff88f983.jpg"],
        stock: 10
    },
    {
        _id: "65cf1234bcf86cd799439228",
        title: "Dokra Jewellery Box",
        slug: "dokra-jewellery-box",
        price: 1300,
        description: "Brass Dokra work box with antique finish.",
        category: { _id: "65cf1234bcf86cd799439115", name: "Home Decor" },
        shopId: { _id: "65cf1234bcf86cd799439028", name: "Tribal Casting" },
        images: ["/products/WhatsApp Image 2025-11-20 at 15.58.50_3e312e8f.jpg"],
        stock: 5
    },
    {
        _id: "65cf1234bcf86cd799439229",
        title: "Manipur Black Stone Pottery Mug",
        slug: "manipur-black-stone-mug",
        price: 500,
        description: "Longpi black stone pottery coffee mug. Earthy and rustic.",
        category: { _id: "65cf1234bcf86cd799439113", name: "Kitchen & Dining" },
        shopId: { _id: "65cf1234bcf86cd799439029", name: "Northeast Clay" },
        images: ["/products/WhatsApp Image 2025-11-20 at 15.59.06_511b379d.jpg"],
        stock: 20
    },
    {
        _id: "65cf1234bcf86cd799439230",
        title: "Channapatna Wooden Toys",
        slug: "channapatna-wooden-toys",
        price: 600,
        description: "Traditional Channapatna wooden toy set for kids. Organic colors.",
        category: { _id: "65cf1234bcf86cd799439120", name: "Toys" },
        shopId: { _id: "65cf1234bcf86cd799439030", name: "Toy Town" },
        images: ["/products/WhatsApp Image 2025-11-20 at 16.00.37_0cd6239d.jpg"],
        stock: 30
    },
    {
        _id: "65cf1234bcf86cd799439231",
        title: "Ikat Cotton Fabric (per meter)",
        slug: "ikat-cotton-fabric",
        price: 350,
        description: "Authentic Sambalpuri Ikat cotton fabric. Ideal for dress material.",
        category: { _id: "65cf1234bcf86cd799439121", name: "Fabric" },
        shopId: { _id: "65cf1234bcf86cd799439031", name: "Orissa Crafts" },
        images: ["/products/WhatsApp Image 2025-11-20 at 16.03.55_d4493b81.jpg"],
        stock: 100
    }
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        console.log('Clearing collections...');
        await db.collection('categories').deleteMany({});
        await db.collection('shops').deleteMany({});
        await db.collection('products').deleteMany({});
        await db.collection('sellerlistings').deleteMany({});
        console.log('Collections cleared.');

        const categoriesMap = new Map();
        const shopsMap = new Map();

        products.forEach(p => {
            if (!categoriesMap.has(p.category._id)) {
                categoriesMap.set(p.category._id, {
                    _id: new mongoose.Types.ObjectId(p.category._id),
                    name: p.category.name,
                    slug: p.category.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
                    description: `Category for ${p.category.name}`
                });
            }
            if (!shopsMap.has(p.shopId._id)) {
                shopsMap.set(p.shopId._id, {
                    _id: new mongoose.Types.ObjectId(p.shopId._id),
                    name: p.shopId.name,
                    slug: p.shopId.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
                    sellerId: new mongoose.Types.ObjectId('65cf1234bcf86cd799439a01'),
                    performanceScore: 90 + Math.floor(Math.random() * 10),
                    isActive: true,
                    isVerified: true,
                    kycStatus: 'approved'
                });
            }
        });

        console.log(`Inserting ${categoriesMap.size} categories...`);
        await db.collection('categories').insertMany(Array.from(categoriesMap.values()));

        console.log(`Inserting ${shopsMap.size} shops...`);
        await db.collection('shops').insertMany(Array.from(shopsMap.values()));

        console.log(`Inserting ${products.length} products...`);
        const productDocs = products.map(p => ({
            _id: new mongoose.Types.ObjectId(p._id),
            title: p.title,
            slug: p.slug,
            description: p.description,
            price: p.price,
            category: new mongoose.Types.ObjectId(p.category._id),
            shopId: new mongoose.Types.ObjectId(p.shopId._id),
            images: p.images,
            isPublished: true,
            isActive: true,
            approvalStatus: 'approved'
        }));
        await db.collection('products').insertMany(productDocs);

        console.log(`Inserting ${products.length} listings...`);
        const listingDocs = products.map((p, idx) => ({
            _id: new mongoose.Types.ObjectId(`65cf1234bcf86cd7994393${(idx + 1).toString().padStart(2, '0')}`),
            productId: new mongoose.Types.ObjectId(p._id),
            shopId: new mongoose.Types.ObjectId(p.shopId._id),
            price: p.price,
            stock: p.stock || 10,
            isActive: true,
            isBuyBoxWinner: true,
            shippingSpeed: 'standard',
            sku: `SKU-${p.slug.toUpperCase()}-001`
        }));
        await db.collection('sellerlistings').insertMany(listingDocs);

        console.log('Seed completed successfully!');
    } catch (error) {
        console.error('Seed failed:', error);
    } finally {
        console.log('Closing connection...');
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
