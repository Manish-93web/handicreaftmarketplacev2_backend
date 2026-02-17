/**
 * Admin 403 Error - Diagnostic and Fix Guide
 * 
 * The 403 error occurs because the admin routes require the 'admin' role,
 * but the logged-in user doesn't have this role.
 * 
 * This script helps diagnose and fix the issue.
 */

const BASE_URL = 'http://localhost:5000/api/v1';

async function diagnoseAdminAccess() {
    console.log('\n=== DIAGNOSING ADMIN ACCESS ISSUE ===\n');

    try {
        // Get the token from your browser's localStorage or cookies
        console.log('STEP 1: Check your current user role');
        console.log('--------------------------------------');
        console.log('In your browser console, run:');
        console.log('  localStorage.getItem("token")');
        console.log('  // or check cookies for "refreshToken"\n');

        // Try to login as admin
        console.log('STEP 2: Login as admin');
        console.log('--------------------------------------');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@handicraft.com',
                password: 'admin123'
            })
        });

        if (!loginRes.ok) {
            const errorData = await loginRes.json();
            console.log('❌ Admin login failed:', errorData.message);
            console.log('\nPossible reasons:');
            console.log('1. Admin account does not exist');
            console.log('2. Wrong password');
            console.log('\nSOLUTION: Create admin account using the script below\n');
            return;
        }

        const loginData = await loginRes.json();
        const adminToken = loginData.data.accessToken;
        const adminUser = loginData.data.user;

        console.log('✓ Admin login successful');
        console.log(`  - Email: ${adminUser.email}`);
        console.log(`  - Role: ${adminUser.role}`);
        console.log(`  - Token: ${adminToken.substring(0, 20)}...`);

        // Test admin endpoint
        console.log('\nSTEP 3: Testing admin endpoint access');
        console.log('--------------------------------------');
        const testRes = await fetch(`${BASE_URL}/admin/products/pending`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (testRes.ok) {
            console.log('✓ Admin endpoint accessible');
            const data = await testRes.json();
            console.log(`  - Found ${data.data.products.length} pending products`);
        } else {
            console.log('❌ Admin endpoint still not accessible');
            console.log(`  - Status: ${testRes.status}`);
        }

        console.log('\n=== SOLUTION ===');
        console.log('In your frontend application:');
        console.log('1. Logout from current account');
        console.log('2. Login with admin credentials:');
        console.log('   - Email: admin@handicraft.com');
        console.log('   - Password: admin123');
        console.log('3. Navigate to /admin/products');
        console.log('\nThe token will be stored in localStorage and used for all requests.\n');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run diagnostic
diagnoseAdminAccess();
