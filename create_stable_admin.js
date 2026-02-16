const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb+srv://mkmanishkumar7366_db_user:handiCraft%40123@cluster0.ppwmtvb.mongodb.net/HandiCraftMarketPlace==Cluster0';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, select: false },
    role: { type: String, default: 'guest' },
    isVerified: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@handicraft.com';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        let admin = await User.findOne({ email });

        if (admin) {
            console.log('Admin user already exists. Updating password...');
            // We need to update directly since we don't have the save pre-hook here (or we do but let's be safe and direct)
            // Actually mongoose models defined here alone don't have the pre-save hook from the app unless we import it.
            // Since we defined the schema inline above, it has NO hooks. So we must providing hashed password.
            await User.updateOne({ _id: admin._id }, {
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            });
            console.log('Admin password updated.');
        } else {
            console.log('Creating new admin user...');
            await User.create({
                name: 'Super Admin',
                email: email,
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            });
            console.log('Admin user created.');
        }

        console.log('---------------------------------------------------');
        console.log('Admin Credentials:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('---------------------------------------------------');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

createAdmin();
