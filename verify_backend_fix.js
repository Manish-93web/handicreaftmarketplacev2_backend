const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';
const PRODUCT_ID = '65cf1234bcf86cd799439201';

async function verifyBackend() {
    console.log('--- Verifying Backend Fix ---');
    try {
        // 1. CSRF
        const initRes = await axios.get(`${API_URL}/csrf-init`, { withCredentials: true });
        const cookies = initRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
        const headers = { 'Cookie': cookies };
        const csrfToken = cookies?.match(/XSRF-TOKEN=([^;]+)/)?.[1];
        if (csrfToken) headers['x-xsrf-token'] = csrfToken;

        // 2. Register/Login Unique User
        const email = `verifier_${Date.now()}@example.com`;
        console.log(`User: ${email}`);

        await axios.post(`${API_URL}/auth/register`, {
            email, password: 'password123', name: 'Verifier', role: 'buyer'
        }, { headers });

        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email, password: 'password123'
        }, { headers });
        const token = loginRes.data.data.token;
        headers['Authorization'] = `Bearer ${token}`;

        // 3. Add to Wishlist via Product ID
        console.log(`Adding Product ${PRODUCT_ID}...`);
        const addRes = await axios.post(`${API_URL}/wishlist/add`, { productId: PRODUCT_ID }, { headers });

        console.log('Add Status:', addRes.status);
        console.log('Wishlist Items:', addRes.data.data.wishlist.items.length);

        const item = addRes.data.data.wishlist.items[0];
        // item.listingId might be an object if populated, or string
        // We know the backend populates it.
        const listing = item.listingId;
        console.log('Added Listing ID:', listing._id || listing);
        console.log('Resolved Product Title:', listing.productId?.title || 'N/A');

        console.log('--- SUCCESS: Backend logic verified ---');

    } catch (error) {
        console.error('FAILED:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

verifyBackend();
