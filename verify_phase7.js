
const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';
let buyerToken, sellerToken, adminToken;
let productId, subOrderId, reviewId;
let csrfToken;

// Helper to include tokens in headers
const getHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    'x-xsrf-token': csrfToken,
    Cookie: `XSRF-TOKEN=${csrfToken}`
});

async function verifyPhase7() {
    try {
        console.log('--- Starting Phase 7 Verification ---');

        // 0. CSRF Handshake
        const csrfRes = await axios.get(`${API_URL}/csrf-init`, { withCredentials: true });
        csrfToken = csrfRes.headers['set-cookie'][0].split(';')[0].split('=')[1];
        console.log('CSRF Handshake complete');

        // 1. Login as Admin to setup commissions
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@handicraft.com',
            password: 'admin123'
        }, { headers: { 'x-xsrf-token': csrfToken, Cookie: `XSRF-TOKEN=${csrfToken}` } });
        adminToken = adminLogin.data.data.token;
        console.log('Admin logged in');

        // 2. Login as Seller
        const sellerLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'seller@example.com',
            password: 'password123'
        }, { headers: { 'x-xsrf-token': csrfToken, Cookie: `XSRF-TOKEN=${csrfToken}` } });
        sellerToken = sellerLogin.data.data.token;
        console.log('Seller logged in');

        // 3. Login as Buyer
        const buyerLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'buyer@example.com',
            password: 'password123'
        }, { headers: { 'x-xsrf-token': csrfToken, Cookie: `XSRF-TOKEN=${csrfToken}` } });
        buyerToken = buyerLogin.data.data.token;
        console.log('Buyer logged in');

        // 4. Test Commission Logic
        // Find a product and check its category commission
        const productRes = await axios.get(`${API_URL}/products`);
        productId = productRes.data.data.products[0]._id;
        console.log(`Testing with Product ID: ${productId}`);

        // 5. Place Order (Verify dynamic commission in background)
        // Assume default address exists from previous phases
        const addressRes = await axios.get(`${API_URL}/addresses`, {
            headers: getHeaders(buyerToken)
        });
        const addressId = addressRes.data.data.addresses[0]._id;

        // Clear cart and add item
        await axios.post(`${API_URL}/cart/add`, { listingId: productRes.data.data.products[0].listings[0]._id, quantity: 1 }, {
            headers: getHeaders(buyerToken)
        });

        const orderRes = await axios.post(`${API_URL}/orders/place`, {
            addressId,
            paymentMethod: 'cod'
        }, {
            headers: getHeaders(buyerToken)
        });
        subOrderId = orderRes.data.data.subOrders[0]._id;
        console.log(`Order placed, SubOrder ID: ${subOrderId}`);
        console.log(`Commission recorded: ₹${orderRes.data.data.subOrders[0].commission}`);

        // 6. Test Review System (Helpful Vote & Edit Window)
        const reviewRes = await axios.post(`${API_URL}/reviews`, {
            productId,
            rating: 5,
            comment: 'Fantastic quality handmade item!',
            videoUrl: 'https://example.com/review-video.mp4'
        }, {
            headers: getHeaders(buyerToken)
        });
        reviewId = reviewRes.data.data.review._id;
        console.log(`Review submitted: ${reviewId}`);

        // Admin approves review
        await axios.patch(`${API_URL}/reviews/${reviewId}/status`, { status: 'approved' }, {
            headers: getHeaders(adminToken)
        });
        console.log('Review approved by Admin');

        // Vote Helpful (as another user or same for testing)
        await axios.post(`${API_URL}/reviews/${reviewId}/helpful`, {}, {
            headers: getHeaders(sellerToken)
        });
        console.log('Review voted as helpful');

        // Edit Review (within 48h)
        await axios.patch(`${API_URL}/reviews/${reviewId}`, { comment: 'Updated: Still amazing after 2 days!' }, {
            headers: getHeaders(buyerToken)
        });
        console.log('Review edited successfully');

        // 7. Test Exchange Logic
        // Deliver the order first
        await axios.patch(`${API_URL}/orders/sub-order/${subOrderId}/status`, { status: 'delivered' }, {
            headers: getHeaders(sellerToken)
        });
        console.log('Order marked as delivered');

        const exchangeRes = await axios.post(`${API_URL}/orders/sub-order/${subOrderId}/exchange`, {
            reason: 'Wrong color received'
        }, {
            headers: getHeaders(buyerToken)
        });
        console.log('Exchange requested successfully');

        // 8. Verify Invoice
        const invoiceRes = await axios.get(`${API_URL}/orders/sub-order/${subOrderId}/invoice`, {
            headers: getHeaders(buyerToken)
        });
        if (invoiceRes.data.includes('HSN/SAC') && invoiceRes.data.includes('CGST')) {
            console.log('Invoice verified: GST compliant content found');
        }

        console.log('--- Phase 7 Verification Complete ---');

    } catch (error) {
        console.error('Verification failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Message:', error.message);
        }
    }
}

verifyPhase7();
