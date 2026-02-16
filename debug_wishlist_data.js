const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';
let token = '';

async function debugWishlist() {
    try {
        console.log('--- Debugging Wishlist Data Structure ---');

        // 1. Login
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'testuser1@example.com',
            password: 'password123'
        });
        token = loginRes.data.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // 2. Get Wishlist
        const res = await axios.get(`${API_URL}/wishlist/me`, { headers });
        console.log(JSON.stringify(res.data, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.log(error.response.data);
    }
}

debugWishlist();
