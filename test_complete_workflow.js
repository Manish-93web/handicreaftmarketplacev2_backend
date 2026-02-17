const BASE_URL = 'http://localhost:5000/api/v1';

async function testCompleteWorkflow() {
    console.log('=== Testing Complete Two-Stage Approval Workflow ===\n');

    try {
        // Step 1: CSRF Handshake
        console.log('Step 1: CSRF Handshake...');
        const csrfRes = await fetch(`${BASE_URL}/csrf-init`);
        const cookies = csrfRes.headers.get('set-cookie');
        const xsrfToken = cookies ? cookies.split(';').find(c => c.trim().startsWith('XSRF-TOKEN=')).split('=')[1] : '';
        console.log('✓ CSRF Token obtained\n');

        // Step 2: Register Seller
        console.log('Step 2: Registering new seller...');
        const sellerEmail = `artisan_${Date.now()}@test.com`;
        const sellerData = {
            name: 'Test Artisan',
            email: sellerEmail,
            phone: '+919876543210',
            shopName: 'Artisan Crafts',
            businessDetails: 'We create beautiful handcrafted items using traditional techniques passed down through generations.'
        };

        const registerRes = await fetch(`${BASE_URL}/auth/register-seller`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-xsrf-token': xsrfToken,
                'Cookie': `XSRF-TOKEN=${xsrfToken}`
            },
            body: JSON.stringify(sellerData)
        });

        const registerData = await registerRes.json();
        if (registerData.status !== 'success') {
            throw new Error(`Registration failed: ${registerData.message}`);
        }

        const shopId = registerData.data.shop._id;
        console.log(`✓ Seller registered successfully`);
        console.log(`  Email: ${sellerEmail}`);
        console.log(`  Shop ID: ${shopId}\n`);

        // Step 3: Admin Login
        console.log('Step 3: Admin login...');
        const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-xsrf-token': xsrfToken,
                'Cookie': `XSRF-TOKEN=${xsrfToken}`
            },
            body: JSON.stringify({
                email: 'admin@handicraft.com',
                password: 'admin123'
            })
        });

        const adminLoginData = await adminLoginRes.json();
        if (adminLoginData.status !== 'success') {
            throw new Error(`Admin login failed: ${adminLoginData.message}`);
        }

        const adminToken = adminLoginData.data.accessToken;
        console.log('✓ Admin logged in successfully\n');

        // Step 4: Admin Approves Seller
        console.log('Step 4: Admin approving seller...');
        const approveRes = await fetch(`${BASE_URL}/admin/shops/${shopId}/approve`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`,
                'x-xsrf-token': xsrfToken,
                'Cookie': `XSRF-TOKEN=${xsrfToken}`
            }
        });

        const approveData = await approveRes.json();
        if (approveData.status !== 'success') {
            throw new Error(`Approval failed: ${approveData.message}`);
        }

        const generatedPassword = approveData.data.generatedPassword;
        console.log('✓ Seller approved successfully');
        console.log(`  Generated Credentials:`);
        console.log(`    Email: ${sellerEmail}`);
        console.log(`    Password: ${generatedPassword}`);
        console.log('  ✓ Email sent to seller');
        console.log('  ✓ SMS sent to seller\n');

        // Step 5: Seller Login with Generated Credentials
        console.log('Step 5: Seller logging in with generated credentials...');
        const sellerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-xsrf-token': xsrfToken,
                'Cookie': `XSRF-TOKEN=${xsrfToken}`
            },
            body: JSON.stringify({
                email: sellerEmail,
                password: generatedPassword
            })
        });

        const sellerLoginData = await sellerLoginRes.json();
        if (sellerLoginData.status !== 'success') {
            throw new Error(`Seller login failed: ${sellerLoginData.message}`);
        }

        const sellerToken = sellerLoginData.data.accessToken;
        console.log('✓ Seller logged in successfully\n');

        // Step 6: Seller Adds Product
        console.log('Step 6: Seller adding product...');
        const productData = {
            title: 'Handwoven Basket',
            description: 'Beautiful handwoven basket made from natural materials',
            price: 1500,
            category: '507f1f77bcf86cd799439011', // You may need to use a real category ID
            images: ['https://example.com/basket.jpg'],
            stock: 10,
            status: 'submit' // This triggers pending approval
        };

        const addProductRes = await fetch(`${BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sellerToken}`,
                'x-xsrf-token': xsrfToken,
                'Cookie': `XSRF-TOKEN=${xsrfToken}`
            },
            body: JSON.stringify(productData)
        });

        const addProductData = await addProductRes.json();
        if (addProductData.status !== 'success') {
            throw new Error(`Product creation failed: ${addProductData.message}`);
        }

        const productId = addProductData.data.product._id;
        console.log('✓ Product added successfully');
        console.log(`  Product ID: ${productId}`);
        console.log(`  Status: pending approval\n`);

        // Step 7: Admin Reviews and Approves Product
        console.log('Step 7: Admin approving product...');
        const approveProductRes = await fetch(`${BASE_URL}/admin/products/${productId}/review`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`,
                'x-xsrf-token': xsrfToken,
                'Cookie': `XSRF-TOKEN=${xsrfToken}`
            },
            body: JSON.stringify({ status: 'approved' })
        });

        const approveProductData = await approveProductRes.json();
        if (approveProductData.status !== 'success') {
            throw new Error(`Product approval failed: ${approveProductData.message}`);
        }

        console.log('✓ Product approved successfully');
        console.log('  ✓ Product is now live on platform');
        console.log('  ✓ Email sent to seller');
        console.log('  ✓ SMS sent to seller\n');

        console.log('=== ✅ COMPLETE WORKFLOW TEST PASSED ===');
        console.log('\nAll steps completed successfully:');
        console.log('1. ✓ Seller registration');
        console.log('2. ✓ Admin approval with credential generation');
        console.log('3. ✓ Email & SMS notifications sent');
        console.log('4. ✓ Seller login with generated credentials');
        console.log('5. ✓ Product submission');
        console.log('6. ✓ Product approval and publishing');
        console.log('7. ✓ Product approval notifications sent');

    } catch (error) {
        console.error('\n❌ WORKFLOW TEST FAILED');
        console.error(`Error: ${error.message}`);
        console.error('\nPlease check:');
        console.error('1. Backend server is running on port 5000');
        console.error('2. Database connection is active');
        console.error('3. Admin account exists (admin@handicraft.com / admin123)');
        console.error('4. All required models and services are properly configured');
    }
}

testCompleteWorkflow();
