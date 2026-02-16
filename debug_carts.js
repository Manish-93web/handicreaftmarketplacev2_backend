const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/handicraft_marketplace';

async function checkCarts() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Define schemas inline to avoid dependencies
        const cartSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            items: [{
                listingId: mongoose.Schema.Types.ObjectId,
                quantity: Number
            }]
        });

        const userSchema = new mongoose.Schema({
            name: String,
            email: String,
            role: String
        });

        const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
        const User = mongoose.models.User || mongoose.model('User', userSchema);

        const users = await User.find();
        console.log(`Total Users: ${users.length}`);

        for (const user of users) {
            const cart = await Cart.findOne({ userId: user._id });
            const itemCount = cart && cart.items ? cart.items.length : 'No Cart';
            console.log(`User: ${user.email} | ID: ${user._id} | Cart Items: ${itemCount}`);
            if (cart && cart.items && cart.items.length > 0) {
                cart.items.forEach((item, index) => {
                    console.log(`  [${index}] Listing: ${item.listingId} | Qty: ${item.quantity}`);
                });
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error during cart check:', err);
        process.exit(1);
    }
}

checkCarts();
