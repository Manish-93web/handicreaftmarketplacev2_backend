const fs = require('fs');
const BASE_URL = 'http://localhost:5000/api/v1';

let adminToken = '';
let sellerToken = '';
let shopId = '';

async function log(msg) {
    console.log(msg);
    fs.appendFileSync('admin_verification_log.txt', msg + '\n');
}

async function request(url, method, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // CSRF handling simplified: just get a token first if needed
    // For this script we assume CSRF might be disabled or we handle it if strict.
    // Actually, we need to handle CSRF if it's enabled globally.
    // Let's reuse the cookie logic from debug_onboarding.js if possible, or just try without first.
    // The previous debug script showed CSRF errors. So we MUST handle CSRF.

    return fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
}

// Reuse CSRF logic
let cookies = {};
let csrfToken = '';

function updateCookies(response) {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        const parts = setCookie.split(',');
        parts.forEach(part => {
            const [cookie] = part.split(';');
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                cookies[name] = value;
                if (name === 'XSRF-TOKEN') csrfToken = value;
            }
        });
    }
}

async function fetchWithCookies(url, options = {}) {
    const headers = { ...options.headers };
    const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookieStr) headers['Cookie'] = cookieStr;
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
        headers['x-xsrf-token'] = csrfToken;
    }

    const response = await fetch(url, { ...options, headers });
    updateCookies(response);
    return response;
}

async function main() {
    try {
        log('--- STARTING ADMIN VERIFICATION TEST ---');

        // 0. Init CSRF
        await fetchWithCookies(`${BASE_URL}/csrf-init`, { method: 'GET' });

        // 1. Create Admin
        const adminEmail = `admin_${Date.now()}@test.com`;
        log(`Creating Admin: ${adminEmail}`);
        await fetchWithCookies(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Admin User',
                email: adminEmail,
                password: 'password123',
                role: 'admin'
            })
        });

        // Login Admin
        const adminLoginRes = await fetchWithCookies(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: 'password123' })
        });
        const adminData = await adminLoginRes.json();
        adminToken = adminData.data.accessToken;
        log(`Admin Logged In: ${!!adminToken}`);

        // 2. Create Seller
        const sellerEmail = `seller_${Date.now()}@test.com`;
        log(`Creating Seller: ${sellerEmail}`);
        await fetchWithCookies(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Seller User',
                email: sellerEmail,
                password: 'password123',
                role: 'seller'
            })
        });

        // Login Seller
        const sellerLoginRes = await fetchWithCookies(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: sellerEmail, password: 'password123' })
        });
        const sellerData = await sellerLoginRes.json();
        sellerToken = sellerData.data.accessToken;
        log(`Seller Logged In: ${!!sellerToken}`);

        // 3. Create Shop
        log('Seller Creating Shop...');
        const createShopRes = await fetchWithCookies(`${BASE_URL}/shops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sellerToken}` },
            body: JSON.stringify({ name: `Shop ${Date.now()}`, description: 'Test Shop' })
        });
        const shopData = await createShopRes.json();
        shopId = shopData.data.shop._id;
        log(`Shop Created: ${shopId}`);

        // 4. Update KYC Details
        log('Seller Updating KYC...');
        await fetchWithCookies(`${BASE_URL}/shops/me`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sellerToken}` },
            body: JSON.stringify({
                businessDetails: { pan: 'ABCDE1234F', address: '123 St' },
                bankDetails: { accountNumber: '1234567890', ifscCode: 'SBIN0001234' }
            })
        });

        // 5. Admin List Pending
        log('Admin Listing Pending Shops...');
        const pendingRes = await fetchWithCookies(`${BASE_URL}/admin/shops?kycStatus=pending`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        let pendingData = await pendingRes.json();
        let found = pendingData.data.shops.find(s => s._id === shopId);
        log(`Found pending shop: ${!!found}`);

        // 6. Admin Reject
        log('Admin Rejecting Shop...');
        const rejectRes = await fetchWithCookies(`${BASE_URL}/admin/shops/${shopId}/reject`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ reason: 'Invalid PAN' })
        });
        const rejectData = await rejectRes.json();
        log(`Reject Response Success: ${rejectData.success}`);

        // Verify Rejection
        const shopAfterRejectRes = await fetchWithCookies(`${BASE_URL}/admin/shops`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const allShops = (await shopAfterRejectRes.json()).data.shops;
        const rejectedShop = allShops.find(s => s._id === shopId);
        log(`Shop Status: ${rejectedShop.kycStatus}`);
        log(`Rejection Reason: ${rejectedShop.rejectionReason}`);

        if (rejectedShop.kycStatus === 'rejected' && rejectedShop.rejectionReason === 'Invalid PAN') {
            log('SUCCESS: Rejection verified.');
        } else {
            log('FAILURE: Rejection verification failed.');
        }

        // 7. Admin Approve
        log('Admin Approving Shop...');
        const approveRes = await fetchWithCookies(`${BASE_URL}/admin/shops/${shopId}/approve`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const approveData = await approveRes.json();
        log(`Approve Response Success: ${approveData.success}`);

        // Verify Approval
        const shopAfterApproveRes = await fetchWithCookies(`${BASE_URL}/admin/shops`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const approvedShop = (await shopAfterApproveRes.json()).data.shops.find(s => s._id === shopId);
        log(`Shop Status: ${approvedShop.kycStatus}`);

        if (approvedShop.kycStatus === 'approved' && approvedShop.isVerified === true) {
            log('SUCCESS: Approval verified.');
            fs.writeFileSync('admin_result.txt', 'SUCCESS');
        } else {
            log('FAILURE: Approval verification failed.');
            fs.writeFileSync('admin_result.txt', 'FAILURE');
        }

    } catch (err) {
        log('ERROR: ' + err.toString());
        fs.writeFileSync('admin_result.txt', 'ERROR: ' + err.toString());
    }
}

main();
