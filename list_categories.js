
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, 'src', 'config', '.env') });
// Fallback if .env is in root
dotenv.config();

const CategorySchema = new mongoose.Schema({
    name: String,
    slug: String,
    description: String,
    image: String,
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    isActive: Boolean
});

const Category = mongoose.model('Category', CategorySchema);

async function listCategories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const categories = await Category.find({});
        console.log('Categories found:', categories.length);
        console.table(categories.map(c => ({ _id: c._id.toString(), name: c.name, slug: c.slug })));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listCategories();
