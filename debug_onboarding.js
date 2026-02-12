const fs = require('fs');
const BASE_URL = 'http://localhost:5000/api/v1';

let cookies = {};
let csrfToken = '';

function log(msg) {
    console.log(msg);
    fs.appendFileSync('debug_log.txt', msg + '\n');
}

function updateCookies(response) {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        const parts = setCookie.split(','); // Simplified splitting
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

    // Add Cookie header
    const cookieStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookieStr) headers['Cookie'] = cookieStr;

    // Add CSRF header
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
        headers['x-xsrf-token'] = csrfToken;
    }

    const response = await fetch(url, { ...options, headers });
    updateCookies(response);
    return response;
}

async function main() {
    try {
        // 0. Init CSRF
        log('Initializing CSRF...');
        await fetchWithCookies(`${BASE_URL}/csrf-init`, { method: 'GET' });
        log('CSRF Token: ' + csrfToken);

        // const email = `seller_${Date.now()}@test.com`;
        const email = 'seller_1770883059948@test.com'; // Use existing user
        log(`Using existing user: ${email}`);

        // 1. Register (Skipped)
        // const registerResponse = await fetchWithCookies(`${BASE_URL}/auth/register`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         name: 'Test Seller',
        //         email,
        //         password: 'password123',
        //         role: 'seller'
        //     })
        // });

        // const regResult = await registerResponse.json();
        // log('Register Response: ' + JSON.stringify(regResult));

        // 2. Login
        log('Logging in...');
        const loginResponse = await fetchWithCookies(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123'
            })
        });

        const loginData = await loginResponse.json();
        log('Login Response: ' + JSON.stringify(loginData));

        if (loginData.status !== 'success') {
            log('Login failed!');
            return;
        }
        const token = loginData.data?.accessToken;
        log('Got token: ' + (token ? 'Yes' : 'No'));

        if (!token) throw new Error('No token');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 3. Create Shop
        log('Creating Shop...');
        const createShopRes = await fetchWithCookies(`${BASE_URL}/shops`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: `Test Shop ${Date.now()}`,
                description: 'A test shop description'
            })
        });
        const shopData = await createShopRes.json();
        log('Create Shop Result: ' + JSON.stringify(shopData));

        // 4. Update Business Details
        log('Updating Business Details...');
        const updateBizRes = await fetchWithCookies(`${BASE_URL}/shops/me`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                businessDetails: {
                    pan: 'ABCDE1234F',
                    gstin: '22AAAAA0000A1Z5',
                    address: '123 Test St, Jaipur, RJ'
                }
            })
        });
        const bizData = await updateBizRes.json();
        log('Update Business Result: ' + JSON.stringify(bizData));

        // 5. Update Bank Details
        log('Updating Bank Details...');
        const updateBankRes = await fetchWithCookies(`${BASE_URL}/shops/me`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                bankDetails: {
                    accountHolderName: 'Test Holder',
                    accountNumber: '1234567890',
                    ifscCode: 'SBIN0001234',
                    bankName: 'SBI'
                }
            })
        });
        const bankData = await updateBankRes.json();
        log('Update Bank Result: ' + JSON.stringify(bankData));

        // 6. Verify Data
        log('Verifying Data...');
        const getShopRes = await fetchWithCookies(`${BASE_URL}/shops/me`, {
            method: 'GET',
            headers
        });
        const finalData = await getShopRes.json();
        const shop = finalData.data.shop;

        if (
            shop.businessDetails?.pan === 'ABCDE1234F' &&
            shop.bankDetails?.accountNumber === '1234567890'
        ) {
            log('SUCCESS: All details verified correctly!');
            fs.writeFileSync('result.txt', 'SUCCESS');
        } else {
            log('FAILURE: Details missing or incorrect: ' + JSON.stringify(shop));
            fs.writeFileSync('result.txt', 'FAILURE: ' + JSON.stringify(shop));
        }

    } catch (err) {
        log('Error: ' + err.toString());
    }
}

main();
