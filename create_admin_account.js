/**
 * Create Admin Account
 * 
 * Run this script to create an admin account if one doesn't exist
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdminAccount() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/handicraft-marketplace');
        console.log('Connected to MongoDB');

        // Get User model
        const User = mongoose.model('User', new mongoose.Schema({
            name: String,
            email: { type: String, unique: true },
            password: String,
            role: String,
            isVerified: Boolean,
            walletBalance: Number
        }));

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: 'admin@handicraft.com' });

        if (existingAdmin) {
            console.log('✓ Admin account already exists');
            console.log(`  - Email: ${existingAdmin.email}`);
            console.log(`  - Role: ${existingAdmin.role}`);
            console.log(`  - Verified: ${existingAdmin.isVerified}`);

            // Update password if needed
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            existingAdmin.password = hashedPassword;
            existingAdmin.role = 'admin';
            existingAdmin.isVerified = true;
            await existingAdmin.save();
            console.log('✓ Admin password reset to: admin123');
        } else {
            // Create new admin
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            const admin = await User.create({
                name: 'Admin',
                email: 'admin@handicraft.com',
                password: hashedPassword,
                role: 'admin',
                isVerified: true,
                walletBalance: 0
            });

            console.log('✓ Admin account created successfully');
            console.log(`  - Email: ${admin.email}`);
            console.log(`  - Password: admin123`);
            console.log(`  - Role: ${admin.role}`);
        }

        await mongoose.disconnect();
        console.log('\nYou can now login with:');
        console.log('  Email: admin@handicraft.com');
        console.log('  Password: admin123');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createAdminAccount();
