const axios = require('axios');

async function check() {
    try {
        console.log('Checking http://localhost:5000/api/health');
        const res1 = await axios.get('http://localhost:5000/api/health');
        console.log('Health 1:', res1.status, res1.data);
    } catch (e) { console.error('Health 1 Failed:', e.message, e.response?.status); }

    try {
        console.log('Checking http://localhost:5000/api/v1/health');
        const res2 = await axios.get('http://localhost:5000/api/v1/health');
        console.log('Health 2:', res2.status, res2.data);
    } catch (e) { console.error('Health 2 Failed:', e.message, e.response?.status); }

    try {
        console.log('Checking http://localhost:5000/api/v1/csrf-init');
        const res3 = await axios.get('http://localhost:5000/api/v1/csrf-init');
        console.log('CSRF Init:', res3.status, res3.data);
    } catch (e) { console.error('CSRF Init Failed:', e.message, e.response?.status); }
}

check();
