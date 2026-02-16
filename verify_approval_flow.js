const BASE_URL = 'http://localhost:5000/api/v1';
const ADMIN_EMAIL = 'admin@handicraft.com';
const ADMIN_PASSWORD = 'admin123';

async function verifyFlow() {
    try {
        console.log('--- VERIFYING PRODUCT APPROVAL FLOW ---');

        // 1. Admin Login
        const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        });
        const adminData = await adminLogin.json();
        const adminToken = adminData.data.accessToken;
        console.log('Admin logged in.');

        // 2. Create a test product (as Admin just for ease, endpoint allows it)
        console.log('Creating test product...');
        const addRes = await fetch(`${BASE_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                title: 'VERIFICATION Masterpiece',
                description: 'A masterpiece created for verification purposes.',
                price: 999,
                stock: 5,
                category: '65cf1234bcf86cd799439101',
                status: 'submit'
            })
        });
        const addData = await addRes.json();
        const productId = addData.data.product._id;
        console.log(`Product created: ${productId}. Status: ${addData.data.product.approvalStatus}`);

        // 3. Verify in Admin Pending List
        console.log('Checking Admin Pending List...');
        const pendingRes = await fetch(`${BASE_URL}/admin/products/pending`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const pendingData = await pendingRes.json();
        const isFound = pendingData.data.products.some(p => p._id === productId);
        console.log(`Product found in Admin Pending list? ${isFound}`);

        // 4. Admin Approve
        console.log('Admin approving product...');
        const approveRes = await fetch(`${BASE_URL}/admin/products/${productId}/review`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ status: 'approved' })
        });
        const approveData = await approveRes.json();
        console.log(`Product approved. isPublished: ${approveData.data.product.isPublished}`);

        // 5. Verify Public Visibility
        console.log('Checking public visibility...');
        const publicRes = await fetch(`${BASE_URL}/products`);
        const publicData = await publicRes.json();
        const isPubliclyFound = publicData.data.products.some(p => p._id === productId);
        console.log(`Product found on homepage? ${isPubliclyFound}`);

        if (isFound && approveData.data.product.isPublished && isPubliclyFound) {
            console.log('SUCCESS: End-to-end flow verified.');
        } else {
            console.error('FAILURE: Verification failed.');
        }

    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verifyFlow();
