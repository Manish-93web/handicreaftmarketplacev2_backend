
const mongoose = require('mongoose');

const uri = 'mongodb+srv://mkmanishkumar7366_db_user:handiCraft%40123@cluster0.ppwmtvb.mongodb.net/HandiCraftMarketPlace==Cluster0';

const CategorySchema = new mongoose.Schema({
    name: String,
    slug: String,
    description: String,
    image: String,
    isActive: Boolean
});

const Category = mongoose.model('Category', CategorySchema);

async function listCategories() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const categories = await Category.find({});
        console.log('Categories found:', categories.length);

        categories.forEach(c => {
            console.log(`ID: ${c._id} | Name: ${c.name} | Slug: ${c.slug}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listCategories();
