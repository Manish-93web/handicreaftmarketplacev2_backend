const axios = require('axios');

async function probe() {
    try {
        console.log('Probing /api/v1/wishlist/add...');
        // Sending a POST request without auth/csrf. 
        // Should return 403 (CSRF) or 401 (Auth) if route exists.
        // Should return 404 if route does not exist.
        await axios.post('http://localhost:5000/api/v1/wishlist/add', {});
    } catch (error) {
        if (error.response) {
            console.log(`Response Status: ${error.response.status}`);
            console.log(`Response Message: ${error.response.data.message}`);
        } else {
            console.log('Error:', error.message);
        }
    }
}

probe();
