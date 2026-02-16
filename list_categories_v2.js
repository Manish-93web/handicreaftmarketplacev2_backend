
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars - try multiple locations
dotenv.config({ path: path.resolve(__dirname, 'src', 'config', '.env') });
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: path.resolve(__dirname, '.env') });
}

console.log('URI:', process.env.MONGODB_URI ? 'Found' : 'Not Found');

const CategorySchema = new mongoose.Schema({
    name: String,
    slug: String,
    description: String,
    image: String,
    isActive: Boolean
});

// Polyfill for table if needed, or just console.log
const Category = mongoose.model('Category', CategorySchema);

async function listCategories() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is undefined');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const categories = await Category.find({});
        console.log('Categories found:', categories.length);

        categories.forEach(c => {
            console.log(`${c._id} | ${c.name} | ${c.slug}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listCategories();
