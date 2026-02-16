const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';
let token = '';

async function debugWishlist() {
    try {
        console.log('--- Debugging Wishlist Data Structure ---');

        // 1. Get CSRF Token (needed for login)
        const initRes = await axios.get(`${API_URL}/csrf-init`, { withCredentials: true });
        const cookies = initRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');

        const headers = {
            'Cookie': cookies
        };
        const csrfToken = cookies?.match(/XSRF-TOKEN=([^;]+)/)?.[1];
        if (csrfToken) headers['x-xsrf-token'] = csrfToken;

        // 2. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'testuser1@example.com',
            password: 'password123'
        }, { headers });

        token = loginRes.data.data.token;
        headers['Authorization'] = `Bearer ${token}`;

        // 3. Get Wishlist
        console.log('Fetching Wishlist...');
        const res = await axios.get(`${API_URL}/wishlist/me`, { headers });

        console.log('--- Wishlist Response Data ---');
        // Log the deeply nested structure to see if listingId/productId are populated
        const items = res.data.data.wishlist.items;
        console.log(`Total Items: ${items.length}`);

        if (items.length > 0) {
            console.log('First Item Structure:', JSON.stringify(items[0], null, 2));
        } else {
            console.log('Wishlist is empty.');
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugWishlist();
