const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

const API_URL = 'http://localhost:5000/api/v1';
let cookieJar = '';
let csrfToken = '';

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    validateStatus: () => true
});

apiClient.interceptors.request.use(config => {
    if (cookieJar) config.headers['Cookie'] = cookieJar;
    if (csrfToken) config.headers['x-xsrf-token'] = csrfToken;
    return config;
});

apiClient.interceptors.response.use(response => {
    if (response.headers['set-cookie']) {
        const newCookies = response.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        cookieJar = newCookies;
    }
    return response;
});

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
    fs.appendFileSync('cart_checkout_log.txt', msg + '\n');
}

async function runTest() {
    try {
        log('Starting Cart & Checkout Verification (with Seeding)...');

        // 1. Initialize CSRF
        const csrfRes = await apiClient.get('/csrf-init');
        if (csrfRes.headers['set-cookie']) {
            const tokenCookie = csrfRes.headers['set-cookie'].find(c => c.includes('XSRF-TOKEN'));
            if (tokenCookie) {
                csrfToken = tokenCookie.split(';')[0].split('=')[1];
                log('CSRF Token Initialized: ' + csrfToken);
            }
        }

        // --- SEEDING PHASE ---
        const sellerEmail = `seller_${Date.now()}@test.com`;
        const buyerEmail = `buyer_${Date.now()}@test.com`;

        // 2. Register Seller
        await apiClient.post('/auth/register', {
            name: 'Test Seller',
            email: sellerEmail,
            password: 'password123',
            role: 'seller'
        });
        const sellerLoginRes = await apiClient.post('/auth/login', { email: sellerEmail, password: 'password123' });
        log('Seller Login Status: ' + sellerLoginRes.status);
        if (!sellerLoginRes.data.success) {
            log('Seller Login Failure: ' + JSON.stringify(sellerLoginRes.data));
            throw new Error('Seller Login Failed');
        }

        // 3. Create Shop
        let shopRes = await apiClient.post('/shops', {
            name: `Handmade Haven ${Date.now()}`,
            description: 'Best handmade items.'
        });

        if (!shopRes.data.success) {
            log('Shop creation failed, checking for existing shops...');
            const existingShops = await apiClient.get('/shops');
            log('Existing shops response: ' + JSON.stringify(existingShops.data));

            if (existingShops.data.data && existingShops.data.data.shops && existingShops.data.data.shops.length > 0) {
                log('Using existing shop: ' + existingShops.data.data.shops[0]._id);
                shopRes = { data: { success: true, data: { shop: existingShops.data.data.shops[0] } } };
            } else {
                log('Shop Creation Failed: ' + JSON.stringify(shopRes.data));
                throw new Error('Shop creation failed and no existing shops found.');
            }
        }

        log('Shop Created/Found: ' + (shopRes.data.success ? 'Yes' : 'No'));
        const shopId = shopRes.data.data.shop._id;

        // 4. Create Product
        const productRes = await apiClient.post('/products', {
            title: `Macrame Wall Hanging ${Date.now()}`,
            description: 'Beautiful boho decor.',
            category: '67a75a7b6b2169ad24f2b604', // Assuming valid category ID or fetch one
            price: 1500,
            stock: 10,
            images: ['https://example.com/image.jpg']
        });

        // If Category fails, fetch one first
        let productId;
        if (!productRes.data.success && productRes.data.message.includes('Category')) {
            const catRes = await apiClient.get('/seed'); // Try seeding
            const cats = await apiClient.get('/products/categories');
            const validCat = cats.data.data.categories[0]._id;

            const productRetry = await apiClient.post('/products', {
                title: `Macrame Wall Hanging ${Date.now()}`,
                description: 'Beautiful boho decor.',
                category: validCat,
                price: 1500,
                stock: 10,
                images: ['https://example.com/image.jpg']
            });
            productId = productRetry.data.data.product._id;
            log('Product Created (Retry): ' + productId);
        } else {
            if (productRes.data.success) {
                productId = productRes.data.data.product._id;
                log('Product Created: ' + productId);
            } else {
                log('Product Creation Failed: ' + JSON.stringify(productRes.data));
                // Try fetching existing product as fallback
                const existing = await apiClient.get('/products');
                if (existing.data.data.products.length > 0) {
                    productId = existing.data.data.products[0]._id;
                    log('Using Existing Product: ' + productId);
                } else {
                    throw new Error('No product available for testing');
                }
            }
        }

        // Logout Seller
        await apiClient.post('/auth/logout');
        cookieJar = ''; // Clear session

        // --- BUYER PHASE ---

        // 5. Register & Login Buyer
        // Re-init CSRF for clean session
        const csrfRes2 = await apiClient.get('/csrf-init');
        if (csrfRes2.headers['set-cookie']) {
            const tokenCookie = csrfRes2.headers['set-cookie'].find(c => c.includes('XSRF-TOKEN'));
            if (tokenCookie) {
                csrfToken = tokenCookie.split(';')[0].split('=')[1];
            }
        }

        await apiClient.post('/auth/register', {
            name: 'Test Buyer',
            email: buyerEmail,
            password: 'password123',
            role: 'buyer'
        });
        const loginRes = await apiClient.post('/auth/login', { email: buyerEmail, password: 'password123' });
        log('Buyer Logged In: ' + loginRes.data.success);

        // 6. Add to Cart
        const addRes = await apiClient.post('/cart/add', { productId, quantity: 2 });
        log('Add to Cart Status: ' + addRes.status + ' - ' + (addRes.data.success ? 'Success' : 'Failed'));

        // 7. View Cart
        const cartRes = await apiClient.get('/cart');
        log('Cart Items Count: ' + cartRes.data.data.cart.items.length);

        // 8. Add Address
        const addrRes = await apiClient.post('/addresses', {
            fullName: 'Buyer One',
            phone: '9876543210',
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '500001',
            country: 'India',
            isDefault: true
        });
        log('Address Created: ' + (addrRes.data.success ? 'Yes' : 'No'));
        const addressId = addrRes.data.data.address._id;

        // 9. Place Order
        const orderRes = await apiClient.post('/orders/place', {
            addressId,
            paymentMethod: 'COD'
        });

        if (orderRes.data.success) {
            log('Order Placed Successfully. Order ID: ' + orderRes.data.data.order._id);
            fs.writeFileSync('cart_checkout_result.txt', 'SUCCESS');
        } else {
            log('Order Placement Failed: ' + JSON.stringify(orderRes.data));
            fs.writeFileSync('cart_checkout_result.txt', 'FAILURE');
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) console.error('Response:', error.response.data);
        fs.writeFileSync('cart_checkout_result.txt', 'FAILURE');
    }
}

runTest();
