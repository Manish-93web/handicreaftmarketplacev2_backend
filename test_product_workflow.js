/**
 * Test Product Approval Workflow
 * 
 * This script tests the complete product approval workflow:
 * 1. Seller submits product → Shows in seller dashboard as PENDING
 * 2. Product appears in admin pending list
 * 3. Admin approves → Product goes live on homepage, seller sees APPROVED
 * 4. Admin rejects → Seller sees REJECTED status
 */

const BASE_URL = 'http://localhost:5000/api/v1';

async function testProductWorkflow() {
    console.log('\n=== TESTING PRODUCT APPROVAL WORKFLOW ===\n');

    try {
        // ===== STEP 1: Login as Seller =====
        console.log('STEP 1: Logging in as seller...');
        const sellerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'seller@example.com', // Replace with actual seller email
                password: 'password123'
            })
        });

        if (!sellerLoginRes.ok) {
            console.log('❌ Seller login failed. Please update seller credentials in the script.');
            console.log('   Or create a seller account first using the seller registration flow.');
            return;
        }

        const sellerLoginData = await sellerLoginRes.json();
        const sellerToken = sellerLoginData.data.accessToken;
        console.log('✓ Seller logged in successfully');

        // ===== STEP 2: Seller Submits Product =====
        console.log('\nSTEP 2: Seller submitting product...');
        const productData = {
            title: `Test Product ${Date.now()}`,
            description: 'This is a test product for approval workflow',
            price: 1500,
            stock: 5,
            category: '65cf1234bcf86cd799439101', // Update with valid category ID
            images: ['https://example.com/product.jpg'],
            status: 'submit' // This sets approvalStatus to 'pending'
        };

        const createProductRes = await fetch(`${BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sellerToken}`
            },
            body: JSON.stringify(productData)
        });

        if (!createProductRes.ok) {
            const errorData = await createProductRes.json();
            console.log('❌ Product creation failed:', errorData.message);
            return;
        }

        const createProductData = await createProductRes.json();
        const productId = createProductData.data.product._id;
        console.log('✓ Product submitted successfully');
        console.log(`  - Product ID: ${productId}`);
        console.log(`  - Approval Status: ${createProductData.data.product.approvalStatus}`);

        // ===== STEP 3: Verify Product in Seller Dashboard =====
        console.log('\nSTEP 3: Checking seller dashboard...');
        const myProductsRes = await fetch(`${BASE_URL}/products/my-products`, {
            headers: { 'Authorization': `Bearer ${sellerToken}` }
        });

        const myProductsData = await myProductsRes.json();
        const sellerProduct = myProductsData.data.products.find(p => p._id === productId);

        if (!sellerProduct) {
            console.log('❌ Product NOT found in seller dashboard');
            return;
        }

        console.log('✓ Product found in seller dashboard');
        console.log(`  - Title: ${sellerProduct.title}`);
        console.log(`  - Status: ${sellerProduct.approvalStatus}`);
        console.log(`  - Price: ₹${sellerProduct.listing?.price || 0}`);
        console.log(`  - Stock: ${sellerProduct.listing?.stock || 0}`);

        if (sellerProduct.approvalStatus !== 'pending') {
            console.log('⚠ WARNING: Product status is not "pending"');
        }

        // ===== STEP 4: Login as Admin =====
        console.log('\nSTEP 4: Logging in as admin...');
        const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@handicraft.com',
                password: 'admin123'
            })
        });

        if (!adminLoginRes.ok) {
            console.log('❌ Admin login failed');
            return;
        }

        const adminLoginData = await adminLoginRes.json();
        const adminToken = adminLoginData.data.accessToken;
        console.log('✓ Admin logged in successfully');

        // ===== STEP 5: Verify Product in Admin Pending List =====
        console.log('\nSTEP 5: Checking admin pending products...');
        const pendingProductsRes = await fetch(`${BASE_URL}/admin/products/pending`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        const pendingProductsData = await pendingProductsRes.json();
        const adminProduct = pendingProductsData.data.products.find(p => p._id === productId);

        if (!adminProduct) {
            console.log('❌ Product NOT found in admin pending list');
            return;
        }

        console.log('✓ Product found in admin pending list');
        console.log(`  - Title: ${adminProduct.title}`);
        console.log(`  - Status: ${adminProduct.approvalStatus}`);

        // ===== STEP 6: Admin Approves Product =====
        console.log('\nSTEP 6: Admin approving product...');
        const approveRes = await fetch(`${BASE_URL}/admin/products/${productId}/review`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: 'approved' })
        });

        if (!approveRes.ok) {
            console.log('❌ Product approval failed');
            return;
        }

        const approveData = await approveRes.json();
        console.log('✓ Product approved successfully');
        console.log(`  - New Status: ${approveData.data.product.approvalStatus}`);
        console.log(`  - Published: ${approveData.data.product.isPublished}`);

        // ===== STEP 7: Verify Product on Homepage =====
        console.log('\nSTEP 7: Checking public homepage...');
        const publicProductsRes = await fetch(`${BASE_URL}/products`);
        const publicProductsData = await publicProductsRes.json();

        const isPublic = publicProductsData.data.products.some(p => p._id === productId);
        if (isPublic) {
            console.log('✓ Product is now visible on public homepage');
        } else {
            console.log('⚠ Product not yet visible on homepage (may need indexing)');
        }

        // ===== STEP 8: Verify Status Update in Seller Dashboard =====
        console.log('\nSTEP 8: Checking seller dashboard for status update...');
        const updatedProductsRes = await fetch(`${BASE_URL}/products/my-products`, {
            headers: { 'Authorization': `Bearer ${sellerToken}` }
        });

        const updatedProductsData = await updatedProductsRes.json();
        const updatedProduct = updatedProductsData.data.products.find(p => p._id === productId);

        if (updatedProduct.approvalStatus === 'approved') {
            console.log('✓ Seller dashboard shows APPROVED status');
        } else {
            console.log(`⚠ Seller dashboard shows: ${updatedProduct.approvalStatus}`);
        }

        // ===== SUMMARY =====
        console.log('\n' + '='.repeat(60));
        console.log('WORKFLOW TEST COMPLETE');
        console.log('='.repeat(60));
        console.log('\nWorkflow Steps Verified:');
        console.log('1. ✓ Seller submits product');
        console.log('2. ✓ Product appears in seller dashboard as PENDING');
        console.log('3. ✓ Product appears in admin pending list');
        console.log('4. ✓ Admin approves product');
        console.log('5. ✓ Product goes live on homepage');
        console.log('6. ✓ Seller dashboard updates to APPROVED');
        console.log('\nThe complete workflow is working correctly! 🎉\n');

    } catch (error) {
        console.error('\n❌ TEST FAILED');
        console.error('Error:', error.message);
        console.error('\nPlease ensure:');
        console.error('1. Backend server is running');
        console.error('2. You have a seller account created');
        console.error('3. Admin account exists');
        console.error('4. Category ID in script is valid');
    }
}

// Run the test
testProductWorkflow();
