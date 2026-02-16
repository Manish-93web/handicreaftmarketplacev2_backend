const fs = require('fs');
try {
    const data = fs.readFileSync('shop_fail.txt', 'utf8');
    const json = JSON.parse(data);
    console.log('Error Message:', json.message);
} catch (e) {
    console.error('Failed to read:', e.message);
}
