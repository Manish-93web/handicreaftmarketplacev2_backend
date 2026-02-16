const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function debugAddWishlist() {
    try {
        console.log('--- Debugging Add to Wishlist Logic ---');

        // 1. Get CSRF
        const initRes = await axios.get(`${API_URL}/csrf-init`, { withCredentials: true });
        const cookies = initRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
        const headers = { 'Cookie': cookies };
        const csrfToken = cookies?.match(/XSRF-TOKEN=([^;]+)/)?.[1];
        if (csrfToken) headers['x-xsrf-token'] = csrfToken;

        // 2. Register/Login
        const email = `testuser_${Date.now()}@example.com`;
        console.log(`Registering/Logging in as ${email}...`);

        let token;
        try {
            await axios.post(`${API_URL}/auth/register`, {
                email,
                password: 'password123',
                name: 'Test User',
                role: 'buyer'
            }, { headers });

            // Login to get token
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email,
                password: 'password123'
            }, { headers });
            token = loginRes.data.data.token;
        } catch (e) {
            // Check if user exists, then login
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email: 'testuser1@example.com', // Fallback to a known user if possible, or fail
                password: 'password123'
            }, { headers });
            token = loginRes.data.data.token;
        }

        headers['Authorization'] = `Bearer ${token}`;

        // 3. Get a Product ID (from seeding or known ID)
        // We'll try to find a product first
        console.log('Fetching products to find an ID...');
        const productsRes = await axios.get(`${API_URL}/products?limit=1`);
        const product = productsRes.data.data.products[0];
        if (!product) throw new Error('No products found to test with');

        console.log(`Testing with Product ID: ${product._id}`);

        // 4. Add to Wishlist using productId
        console.log('Adding to wishlist with productId...');
        try {
            const addRes = await axios.post(`${API_URL}/wishlist/add`, { productId: product._id }, { headers });
            console.log('Add Response:', addRes.status, addRes.data.message);
            console.log('Wishlist Items Count:', addRes.data.data.wishlist.items.length);
        } catch (err) {
            console.log('Add Failed:', err.response?.data || err.message);
        }

        // 5. Verify it's there
        console.log('Fetching Wishlist to verify...');
        const listRes = await axios.get(`${API_URL}/wishlist/me`, { headers });
        const items = listRes.data.data.wishlist.items;
        const found = items.find(i => i.listingId.productId._id === product._id || i.listingId._id === product._id); // Approximate check

        if (found) {
            console.log('SUCCESS: Item found in wishlist!');
            console.log('Item Details:', JSON.stringify(found, null, 2));
        } else {
            console.log('FAILURE: Item NOT found in wishlist.');
            console.log('Current Wishlist:', JSON.stringify(items, null, 2));
        }

    } catch (error) {
        console.error('Fatal Error:', error.message);
        if (error.response) console.log(error.response.data);
    }
}

debugAddWishlist();
