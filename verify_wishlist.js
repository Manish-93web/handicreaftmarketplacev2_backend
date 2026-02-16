const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';
let token = '';
let csrfToken = '';
let cookies = '';

async function testWishlist() {
    try {
        console.log('--- Testing Wishlist API with Fresh User & CSRF ---');

        // 1. Initialize CSRF
        console.log('Initializing CSRF...');
        const initRes = await axios.get(`${API_URL}/csrf-init`, { withCredentials: true });
        cookies = initRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
        csrfToken = cookies.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '';
        console.log(`CSRF Token Initialized: ${csrfToken ? 'SUCCESS' : 'FAILED'}`);

        const headers = {
            'x-xsrf-token': csrfToken,
            'Cookie': cookies
        };

        // 2. Register a new user
        const uniqueEmail = `testuser_${Date.now()}@example.com`;
        console.log(`Registering new user: ${uniqueEmail}`);
        const registerRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'Test Buyer',
            email: uniqueEmail,
            password: 'password123',
            confirmPassword: 'password123',
            role: 'buyer'
        }, { headers });

        token = registerRes.data.data.token;
        headers['Authorization'] = `Bearer ${token}`;

        // Update cookies after register
        if (registerRes.headers['set-cookie']) {
            cookies = registerRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            headers['Cookie'] = cookies;
            headers['x-xsrf-token'] = cookies.match(/XSRF-TOKEN=([^;]+)/)?.[1] || csrfToken;
        }
        console.log('User registered and logged in successfully');

        // 3. Get a product to add to wishlist
        console.log('Fetching products...');
        const productsRes = await axios.get(`${API_URL}/products`);
        if (!productsRes.data.data.products || productsRes.data.data.products.length === 0) {
            console.log('No products found to test wishlist');
            return;
        }
        const listingId = productsRes.data.data.products[0].buyBoxListing._id;
        const productId = productsRes.data.data.products[0]._id;
        console.log(`Using Listing ID: ${listingId}, Product ID: ${productId}`);

        // 4. Add to wishlist
        console.log('Adding to wishlist...');
        const addRes = await axios.post(`${API_URL}/wishlist/add`, { listingId }, { headers });
        console.log('Add Response:', addRes.data.message);

        // 5. Get wishlist
        console.log('Fetching wishlist...');
        const getRes = await axios.get(`${API_URL}/wishlist/me`, { headers });
        console.log('Wishlist Items Count:', getRes.data.data.wishlist.items.length);

        // 6. Add by productId
        console.log('Adding to wishlist by productId...');
        if (addRes.headers['set-cookie']) {
            headers['Cookie'] = addRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            headers['x-xsrf-token'] = headers['Cookie'].match(/XSRF-TOKEN=([^;]+)/)?.[1];
        }
        const addByProdRes = await axios.post(`${API_URL}/wishlist/add`, { productId }, { headers });
        console.log('Add by Prod Response:', addByProdRes.data.message);

        // 7. Remove from wishlist
        console.log('Removing from wishlist...');
        if (addByProdRes.headers['set-cookie']) {
            headers['Cookie'] = addByProdRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            headers['x-xsrf-token'] = headers['Cookie'].match(/XSRF-TOKEN=([^;]+)/)?.[1];
        }
        const removeRes = await axios.delete(`${API_URL}/wishlist/${listingId}`, { headers });
        console.log('Remove Response:', removeRes.data.message);

        // 8. Final check
        console.log('Fetching wishlist again...');
        const finalRes = await axios.get(`${API_URL}/wishlist/me`, { headers });
        console.log('Final Wishlist Items Count:', finalRes.data.data.wishlist.items.length);

        console.log('--- Wishlist API Test Completed Successfully ---');
    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error Details:', error);
        }
    }
}

testWishlist();
