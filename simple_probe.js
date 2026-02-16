const axios = require('axios');

async function probe() {
    try {
        console.log('Probing /api/v1/wishlist/add...');
        // Expecting 403 (Forbidden) because of CSRF/Auth
        await axios.post('http://localhost:5000/api/v1/wishlist/add', {});
    } catch (error) {
        if (error.response) {
            console.log('Status:', error.response.status); // Should be 403 or 401
            console.log('Message:', error.response.data.message);
        } else {
            console.error('Error:', error.message);
        }
    }
}

probe();
