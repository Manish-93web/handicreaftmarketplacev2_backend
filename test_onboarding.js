const BASE_URL = 'http://localhost:5000/api/v1';

async function main() {
    try {
        const email = `seller_${Date.now()}@test.com`;
        console.log(`Registering new user: ${email}`);

        // 1. Register
        const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Seller',
                email,
                password: 'password123',
                role: 'seller'
            })
        });

        // Check if register failed (e.g. CSRF or validation)
        // Actually register might just create user, login is separate or it returns token?
        // AuthController.register returns { user } but not token usually unless auto-login.
        // Let's check AuthController: it returns { user }.
        // So we need to Login.

        // 2. Login
        console.log('Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password123'
            })
        });

        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('Login failed:', loginData);
            return;
        }
        const token = loginData.data?.accessToken;
        console.log('Got token:', token ? 'Yes' : 'No');

        if (!token) throw new Error('No token');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 3. Create Shop
        console.log('Creating Shop...');
        const createShopRes = await fetch(`${BASE_URL}/shops`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: `Test Shop ${Date.now()}`,
                description: 'A test shop description'
            })
        });
        const shopData = await createShopRes.json();
        console.log('Create Shop Result:', shopData.success);

        // 4. Update Business Details
        console.log('Updating Business Details...');
        const updateBizRes = await fetch(`${BASE_URL}/shops/me`, {
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
        console.log('Update Business Result:', bizData.success);

        // 5. Update Bank Details
        console.log('Updating Bank Details...');
        const updateBankRes = await fetch(`${BASE_URL}/shops/me`, {
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
        console.log('Update Bank Result:', bankData.success);

        // 6. Verify Data
        console.log('Verifying Data...');
        const getShopRes = await fetch(`${BASE_URL}/shops/me`, {
            method: 'GET',
            headers
        });
        const finalData = await getShopRes.json();
        const shop = finalData.data.shop;

        if (
            shop.businessDetails?.pan === 'ABCDE1234F' &&
            shop.bankDetails?.accountNumber === '1234567890'
        ) {
            console.log('SUCCESS: All details verified correctly!');
            require('fs').writeFileSync('result.txt', 'SUCCESS');
        } else {
            console.error('FAILURE: Details missing or incorrect', shop);
            require('fs').writeFileSync('result.txt', 'FAILURE: ' + JSON.stringify(shop));
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

main();
