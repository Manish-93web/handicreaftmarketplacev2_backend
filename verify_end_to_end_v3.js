const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:5001/api/v1';
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
        const newCookies = response.headers['set-cookie'];
        let currentCookies = cookieJar ? cookieJar.split('; ').reduce((acc, c) => {
            const [key, ...v] = c.split('=');
            acc[key] = v.join('=');
            return acc;
        }, {}) : {};

        newCookies.forEach(c => {
            const [key, ...v] = c.split(';')[0].split('=');
            currentCookies[key] = v.join('=');
        });

        cookieJar = Object.entries(currentCookies).map(([k, v]) => `${k}=${v}`).join('; ');

        const tokenCookie = response.headers['set-cookie'].find(c => c.includes('XSRF-TOKEN'));
        if (tokenCookie) {
            csrfToken = tokenCookie.split(';')[0].split('=')[1];
            csrfToken = decodeURIComponent(csrfToken);
        }
    }
    return response;
});

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function runTest() {
    try {
        log('Starting End-to-End Verification (v4 - Check status=success)...');

        // 1. Initialize
        const csrfRes = await apiClient.get('/csrf-init');
        if (csrfRes.headers['set-cookie']) {
            const tokenCookie = csrfRes.headers['set-cookie'].find(c => c.includes('XSRF-TOKEN'));
            if (tokenCookie) csrfToken = tokenCookie.split(';')[0].split('=')[1];
        }
        log('Initialized CSRF');

        // --- SELLER FLOW ---
        const sellerEmail = `seller_${Date.now()}@test.com`;
        log(`Registering Seller: ${sellerEmail}`);

        const regRes = await apiClient.post('/auth/register', {
            name: 'Verify Seller',
            email: sellerEmail,
            password: 'password123',
            role: 'seller'
        });
        log('Register Response Status: ' + regRes.status);
        if (regRes.data.status !== 'success') {
            log('Register Failed: ' + JSON.stringify(regRes.data));
            fs.writeFileSync('register_fail.txt', JSON.stringify(regRes.data, null, 2));
            throw new Error('Seller Register Failed');
        }

        const sellerLogin = await apiClient.post('/auth/login', { email: sellerEmail, password: 'password123' });
        log('Login Response Status: ' + sellerLogin.status);
        if (sellerLogin.data.status !== 'success') {
            log('Login Failed: ' + JSON.stringify(sellerLogin.data));
            throw new Error('Seller Login Failed');
        }
        log('Seller Logged In');

        // Create Shop
        const shopRes = await apiClient.post('/shops', {
            name: `Shop ${Date.now()}`,
            description: 'Verification Shop Description'
        });
        if (shopRes.data.status !== 'success') {
            fs.writeFileSync('shop_fail.txt', JSON.stringify(shopRes.data, null, 2));
            throw new Error('Shop Creation Failed: ' + JSON.stringify(shopRes.data));
        }
        log('Shop Created: ' + shopRes.data.data.shop._id);

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
        if (productRes.data.status !== 'success') throw new Error('Product Creation Failed: ' + JSON.stringify(productRes.data));
        const productId = productRes.data.data.product._id;
        log(`Product Created: ${productId} (Category: Home Decor)`);

        // Check verification - simple API get
        try {
            const publicRes = await apiClient.get('/products?category=65cf1234bcf86cd799439105');
            const found = publicRes.data.data.products.find(p => p._id === productId);
            if (found) log('VERIFIED: Product is visible in Home Decor category API');
            else log('NOTE: Product not immediately visible in list (could be sort/pagination)');
        } catch (e) { console.error('Error checking public API', e.message); }

        // Logout Seller
        await apiClient.post('/auth/logout');
        cookieJar = '';
        csrfToken = ''; // Clear token too
        log('Seller Logged Out');

        // --- CUSTOMER FLOW ---
        const buyerEmail = `buyer_${Date.now()}@test.com`;
        log(`Registering Buyer: ${buyerEmail}`);

        // Refresh CSRF for new session
        const csrfRes2 = await apiClient.get('/csrf-init');
        if (csrfRes2.headers['set-cookie']) {
            const tokenCookie = csrfRes2.headers['set-cookie'].find(c => c.includes('XSRF-TOKEN'));
            if (tokenCookie) csrfToken = tokenCookie.split(';')[0].split('=')[1];
        }

        const buyerReg = await apiClient.post('/auth/register', {
            name: 'Verify Buyer',
            email: buyerEmail,
            password: 'password123',
            role: 'buyer'
        });
        if (buyerReg.data.status !== 'success') {
            log('Buyer Register Failed: ' + JSON.stringify(buyerReg.data));
            throw new Error('Buyer Register Failed');
        }

        const buyerLogin = await apiClient.post('/auth/login', { email: buyerEmail, password: 'password123' });
        if (buyerLogin.data.status !== 'success') throw new Error('Buyer Login Failed');
        log('Buyer Logged In');

        // Add to Wishlist
        log(`Adding product ${productId} to Wishlist...`);
        const wishlistRes = await apiClient.post('/wishlist/add', { productId });
        log('Wishlist Res: ' + wishlistRes.status);
        if (wishlistRes.data.status !== 'success') throw new Error('Wishlist Add Failed: ' + JSON.stringify(wishlistRes.data));
        log('Added to Wishlist');

        // Add to Cart
        log(`Adding product ${productId} to Cart...`);
        const cartRes = await apiClient.post('/cart/add', { productId, quantity: 1 });
        if (cartRes.data.status !== 'success') throw new Error('Cart Add Failed: ' + JSON.stringify(cartRes.data));
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
        if (addrRes.data.status !== 'success') throw new Error('Address Creation Failed: ' + JSON.stringify(addrRes.data));
        const addressId = addrRes.data.data.address._id;
        log('Address Created: ' + addressId);

        // Place Order
        const orderRes = await apiClient.post('/orders/place', {
            addressId,
            paymentMethod: 'Online'
        });
        if (orderRes.data.status !== 'success') throw new Error('Order Placement Failed: ' + JSON.stringify(orderRes.data));
        log(`Order Placed: ${orderRes.data.data.order._id}`);

        log('SUCCESS: Full End-to-End Verification Complete');

    } catch (err) {
        console.error('FAILED:', err.message);
        if (err.response) {
            console.error('Data:', err.response.data);
            fs.writeFileSync('error_details.txt', JSON.stringify(err.response.data, null, 2));
        } else {
            fs.writeFileSync('error_details.txt', err.message);
        }
    }
}

runTest();
