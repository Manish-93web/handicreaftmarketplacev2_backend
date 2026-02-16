const BASE_URL = 'http://127.0.0.1:5000/api/v1';
const ADMIN_EMAIL = 'admin@handicraft.com';
const ADMIN_PASSWORD = 'admin123';

async function debugVisibility() {
    try {
        console.log('--- DEBUGGING PRODUCT VISIBILITY ---');

        // 1. Admin Login
        const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        const adminData = await adminLogin.json();
        const adminToken = adminData.data.accessToken;
        console.log('Admin logged in.');

        // 2. Register/Login a Seller
        const sellerEmail = `debug_seller_${Date.now()}@test.com`;
        const regRes = await fetch(`${BASE_URL}/auth/register-seller`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Debug Artist',
                email: sellerEmail,
                phone: '9999999999',
                shopName: 'Debug Shop',
                businessDetails: { address: 'Debug St' }
            })
        });
        const regData = await regRes.json();
        const shopId = regData.data.shop.id;
        console.log(`Seller application submitted. Shop ID: ${shopId}`);

        // 3. Admin Approves Seller
        const approveShopRes = await fetch(`${BASE_URL}/admin/shops/${shopId}/approve`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const approveShopData = await approveShopRes.json();
        const sellerPassword = approveShopData.data.generatedPassword;
        console.log(`Seller approved. Password: ${sellerPassword}`);

        // 4. Seller Login
        const sellerLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: sellerEmail, password: sellerPassword })
        });
        const sellerData = await sellerLogin.json();
        const sellerToken = sellerData.data.accessToken;
        console.log('Seller logged in.');

        // 5. Seller Adds Product
        console.log('Seller adding product...');
        const addRes = await fetch(`${BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sellerToken}`
            },
            body: JSON.stringify({
                title: 'DEBUG Product',
                description: 'A test product for visibility debug.',
                price: 100,
                stock: 10,
                category: '65cf1234bcf86cd799439101',
                status: 'submit'
            })
        });
        const addData = await addRes.json();
        console.log(`Product created. Status: ${addData.data.product.approvalStatus}`);

        // 6. Check Seller Dashboard Visibility
        const myProductsRes = await fetch(`${BASE_URL}/products/my-products`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${sellerToken}` }
        });
        const myProductsData = await myProductsRes.json();
        console.log(`Seller 'my-products' count: ${myProductsData.data.listings.length}`);
        const foundInSeller = myProductsData.data.listings.some(l => l.productId._id === addData.data.product._id);
        console.log(`Confirmed in Seller Dashboard API? ${foundInSeller}`);

        // 7. Check Admin Dashboard Visibility
        const pendingRes = await fetch(`${BASE_URL}/admin/products/pending`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const pendingData = await pendingRes.json();
        console.log(`Admin 'pending' products count: ${pendingData.data.products.length}`);
        const foundInAdmin = pendingData.data.products.some(p => p._id === addData.data.product._id);
        console.log(`Confirmed in Admin Dashboard API? ${foundInAdmin}`);

    } catch (err) {
        console.error('Debug failed:', err);
    }
}

debugVisibility();
