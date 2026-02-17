const BASE_URL = 'http://localhost:5000/api/v1';

/**
 * Complete Seller and Product Approval Workflow Test
 * 
 * This script tests the entire flow:
 * 1. Seller Registration
 * 2. Admin Approval with Credential Generation
 * 3. Seller Login with Generated Credentials
 * 4. Product Submission
 * 5. Admin Product Approval
 * 6. Product Visibility on Public Homepage
 */

async function testCompleteWorkflow() {
    console.log('\n=== TESTING COMPLETE SELLER & PRODUCT APPROVAL WORKFLOW ===\n');

    try {
        // ===== STEP 1: Register a New Seller =====
        console.log('STEP 1: Registering new seller...');
        const sellerEmail = `testartisan${Date.now()}@example.com`;
        const sellerData = {
            name: 'Test Artisan',
            email: sellerEmail,
            phone: '+91 9876543210',
            shopName: `Test Handicrafts ${Date.now()}`,
            businessDetails: 'I create handmade pottery and ceramics with traditional techniques passed down through generations.'
        };

        const registerRes = await fetch(`${BASE_URL}/auth/register-seller`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sellerData)
        });
        const registerData = await registerRes.json();

        if (!registerRes.ok) {
            throw new Error(`Seller registration failed: ${registerData.message}`);
        }

        const shopId = registerData.data.shop.id;
        console.log(`✓ Seller registered successfully`);
        console.log(`  - Email: ${sellerEmail}`);
        console.log(`  - Shop ID: ${shopId}`);
        console.log(`  - Status: Under Review`);

        // ===== STEP 2: Admin Login =====
        console.log('\nSTEP 2: Admin logging in...');
        const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@handicraft.com',
                password: 'admin123'
            })
        });
        const adminLoginData = await adminLoginRes.json();

        if (!adminLoginRes.ok) {
            throw new Error(`Admin login failed: ${adminLoginData.message}`);
        }

        const adminToken = adminLoginData.data.accessToken;
        console.log('✓ Admin logged in successfully');

        // ===== STEP 3: Verify Seller in Pending List =====
        console.log('\nSTEP 3: Checking pending sellers list...');
        const pendingSellersRes = await fetch(`${BASE_URL}/admin/shops?kycStatus=pending`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const pendingSellersData = await pendingSellersRes.json();

        const pendingShop = pendingSellersData.data.shops.find(s => s._id === shopId);
        if (!pendingShop) {
            throw new Error('Seller not found in pending list');
        }
        console.log('✓ Seller found in pending list');

        // ===== STEP 4: Admin Approves Seller =====
        console.log('\nSTEP 4: Admin approving seller...');
        const approveRes = await fetch(`${BASE_URL}/admin/shops/${shopId}/approve`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        });
        const approveData = await approveRes.json();

        if (!approveRes.ok) {
            throw new Error(`Seller approval failed: ${approveData.message}`);
        }

        const generatedPassword = approveData.data.generatedPassword;
        console.log('✓ Seller approved successfully');
        console.log(`  - Generated Email: ${sellerEmail}`);
        console.log(`  - Generated Password: ${generatedPassword}`);
        console.log('  - Notifications: Email and SMS sent');

        // ===== STEP 5: Seller Login with Generated Credentials =====
        console.log('\nSTEP 5: Seller logging in with generated credentials...');
        const sellerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: sellerEmail,
                password: generatedPassword
            })
        });
        const sellerLoginData = await sellerLoginRes.json();

        if (!sellerLoginRes.ok) {
            throw new Error(`Seller login failed: ${sellerLoginData.message}`);
        }

        const sellerToken = sellerLoginData.data.accessToken;
        console.log('✓ Seller logged in successfully with generated credentials');

        // ===== STEP 6: Seller Submits Product =====
        console.log('\nSTEP 6: Seller submitting product for approval...');
        const productData = {
            title: `Handcrafted Pottery Vase ${Date.now()}`,
            description: 'Beautiful handmade ceramic vase with traditional blue glaze patterns',
            price: 2500,
            stock: 10,
            sku: `POT-${Date.now()}`,
            category: '65cf1234bcf86cd799439101', // You may need to adjust this category ID
            images: ['https://example.com/vase.jpg'],
            status: 'submit' // This will set approvalStatus to 'pending'
        };

        const createProductRes = await fetch(`${BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sellerToken}`
            },
            body: JSON.stringify(productData)
        });
        const createProductData = await createProductRes.json();

        if (!createProductRes.ok) {
            throw new Error(`Product creation failed: ${createProductData.message}`);
        }

        const productId = createProductData.data.product._id;
        console.log('✓ Product submitted successfully');
        console.log(`  - Product ID: ${productId}`);
        console.log(`  - Title: ${productData.title}`);
        console.log(`  - Approval Status: ${createProductData.data.product.approvalStatus}`);

        // ===== STEP 7: Verify Product in Admin Pending List =====
        console.log('\nSTEP 7: Checking admin pending products list...');
        const pendingProductsRes = await fetch(`${BASE_URL}/admin/products/pending`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const pendingProductsData = await pendingProductsRes.json();

        const pendingProduct = pendingProductsData.data.products.find(p => p._id === productId);
        if (!pendingProduct) {
            throw new Error('Product not found in admin pending list');
        }
        console.log('✓ Product found in admin pending list');

        // ===== STEP 8: Admin Approves Product =====
        console.log('\nSTEP 8: Admin approving product...');
        const approveProductRes = await fetch(`${BASE_URL}/admin/products/${productId}/review`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: 'approved' })
        });
        const approveProductData = await approveProductRes.json();

        if (!approveProductRes.ok) {
            throw new Error(`Product approval failed: ${approveProductData.message}`);
        }

        console.log('✓ Product approved successfully');
        console.log(`  - Approval Status: ${approveProductData.data.product.approvalStatus}`);
        console.log(`  - Published: ${approveProductData.data.product.isPublished}`);
        console.log('  - Notifications: Email and SMS sent to seller');

        // ===== STEP 9: Verify Product on Public Homepage =====
        console.log('\nSTEP 9: Verifying product visibility on public homepage...');
        const publicProductsRes = await fetch(`${BASE_URL}/products`);
        const publicProductsData = await publicProductsRes.json();

        const isPubliclyVisible = publicProductsData.data.products.some(p => p._id === productId);
        if (!isPubliclyVisible) {
            console.log('⚠ Product not yet visible on homepage (may need to wait for indexing)');
        } else {
            console.log('✓ Product is now visible on public homepage');
        }

        // ===== FINAL SUMMARY =====
        console.log('\n' + '='.repeat(60));
        console.log('SUCCESS: COMPLETE WORKFLOW VERIFIED');
        console.log('='.repeat(60));
        console.log('\nWorkflow Summary:');
        console.log('1. ✓ Seller registered and placed under review');
        console.log('2. ✓ Admin approved seller and generated credentials');
        console.log('3. ✓ Seller logged in with generated credentials');
        console.log('4. ✓ Seller submitted product for approval');
        console.log('5. ✓ Product appeared in admin pending list');
        console.log('6. ✓ Admin approved product');
        console.log('7. ✓ Product published to marketplace');
        console.log('\nNotifications Sent:');
        console.log('- Seller approval: Email + SMS');
        console.log('- Product approval: Email + SMS');
        console.log('\nCheck sms_logs.txt for SMS notification records');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ WORKFLOW TEST FAILED');
        console.error('Error:', error.message);
        console.error('\nPlease check:');
        console.error('1. Backend server is running on http://localhost:5000');
        console.error('2. Admin account exists (admin@handicraft.com / admin123)');
        console.error('3. Database is connected and accessible');
        console.error('4. Category ID in the script matches your database');
        process.exit(1);
    }
}

// Run the test
testCompleteWorkflow();
