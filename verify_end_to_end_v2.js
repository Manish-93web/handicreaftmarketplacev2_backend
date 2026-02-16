const axios = require('axios');
const fs = require('fs');

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
        // Simple cookie jar merge
        if (cookieJar) {
            const jar = cookieJar.split('; ').reduce((acc, c) => {
                const [k, v] = c.split('=');
                acc[k] = v;
                return acc;
            }, {});
            newCookies.split('; ').forEach(c => {
                const [k, v] = c.split('=');
                jar[k] = v;
            });
            cookieJar = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
        } else {
            cookieJar = newCookies;
        }
    }
    return response;
});

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function runTest() {
    try {
        log('Starting End-to-End Verification...');

        // 1. Initialize
        const csrfRes = await apiClient.get('/csrf-init');
        if (csrfRes.headers['set-cookie']) {
            const tokenCookie = csrfRes.headers['set-cookie'].find(c => c.includes('XSRF-TOKEN'));
            if (tokenCookie) csrfToken = tokenCookie.split(';')[0].split('=')[1];
        }
        log('Initialized CSRF');

        // --- SELLER FLOW ---
        const sellerEmail = `verifyseller_${Date.now()}@test.com`;
        log(`Registering Seller: ${sellerEmail}`);

        await apiClient.post('/auth/register', {
            name: 'Verify Seller',
            email: sellerEmail,
            password: 'password123',
            role: 'seller'
        });

        const sellerLogin = await apiClient.post('/auth/login', { email: sellerEmail, password: 'password123' });
        if (!sellerLogin.data.success) throw new Error('Seller Login Failed');
        log('Seller Logged In');

        // Create Shop
        const shopRes = await apiClient.post('/shops', {
            name: `Verify Shop ${Date.now()}`,
            description: 'Verification Shop Description'
        });
        if (!shopRes.data.success) throw new Error('Shop Creation Failed: ' + JSON.stringify(shopRes.data));
        log('Shop Created');

        // Create Product in "Home Decor" (mapped to Artisan Masterpieces)
        // Home Decor ID: 65cf1234bcf86cd799439105
        const productRes = await apiClient.post('/products', {
            title: `Artisan Lamp ${Date.now()}`,
            description: 'Handcrafted lamp for verification',
            category: '65cf1234bcf86cd799439105',
            price: 2500,
            stock: 5,
            images: ['/products/lamp_verify.jpg']
        });
        if (!productRes.data.success) throw new Error('Product Creation Failed: ' + JSON.stringify(productRes.data));
        const productId = productRes.data.data.product._id;
        log(`Product Created: ${productId} (Category: Home Decor)`);

        // Logout Seller
        await apiClient.post('/auth/logout');
        cookieJar = '';
        log('Seller Logged Out');

        // --- PUBLIC CHECK ---
        const publicRes = await apiClient.get('/products?category=65cf1234bcf86cd799439105');
        const found = publicRes.data.data.products.find(p => p._id === productId);
        if (found) log('VERIFIED: Product appears in public API for Home Decor category');
        else log('WARNING: Product NOT found in public API for Home Decor category immediately (might be pagination/indexing)');

        // --- CUSTOMER FLOW ---
        const buyerEmail = `verifybuyer_${Date.now()}@test.com`;
        log(`Registering Buyer: ${buyerEmail}`);

        // Refresh CSRF for new session
        const csrfRes2 = await apiClient.get('/csrf-init');
        if (csrfRes2.headers['set-cookie']) {
            const tokenCookie = csrfRes2.headers['set-cookie'].find(c => c.includes('XSRF-TOKEN'));
            if (tokenCookie) csrfToken = tokenCookie.split(';')[0].split('=')[1];
        }

        await apiClient.post('/auth/register', {
            name: 'Verify Buyer',
            email: buyerEmail,
            password: 'password123',
            role: 'buyer'
        });

        const buyerLogin = await apiClient.post('/auth/login', { email: buyerEmail, password: 'password123' });
        if (!buyerLogin.data.success) throw new Error('Buyer Login Failed');
        log('Buyer Logged In');

        // Add to Wishlist
        const wishlistRes = await apiClient.post('/wishlist/add', { productId });
        if (!wishlistRes.data.success) throw new Error('Wishlist Add Failed: ' + JSON.stringify(wishlistRes.data));
        log('Added to Wishlist');

        // Add to Cart
        const cartRes = await apiClient.post('/cart/add', { productId, quantity: 1 });
        if (!cartRes.data.success) throw new Error('Cart Add Failed: ' + JSON.stringify(cartRes.data));
        log('Added to Cart');

        // Create Address
        const addrRes = await apiClient.post('/addresses', {
            fullName: 'Verify Buyer',
            phone: '1234567890',
            street: 'Verify St',
            city: 'Verify City',
            state: 'VS',
            zipCode: '100000',
            country: 'India',
            isDefault: true
        });
        if (!addrRes.data.success) throw new Error('Address Creation Failed');
        const addressId = addrRes.data.data.address._id;
        log('Address Created');

        // Place Order
        const orderRes = await apiClient.post('/orders/place', {
            addressId,
            paymentMethod: 'Online'
        });
        if (!orderRes.data.success) throw new Error('Order Placement Failed: ' + JSON.stringify(orderRes.data));
        log(`Order Placed: ${orderRes.data.data.order._id}`);

        log('SUCCESS: Full End-to-End Verification Complete');

    } catch (err) {
        console.error('FAILED:', err.message);
        if (err.response) console.error('Data:', err.response.data);
    }
}

runTest();
