const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', 'Manish', 'handicraftMarketPlaceV2', 'handicreaftmarketplacev2_frontend', 'src', 'data', 'products.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Function to generate valid 24-hex ID
function fixId(id, prefixChar) {
    // If it's already a 24-char hex, return it
    if (/^[0-9a-fA-F]{24}$/.test(id)) return id;

    // If it's a legacy ID like prod_011
    const match = id.match(/\d+/);
    const num = match ? match[0] : '0';
    const prefix = '65cf1234bcf86cd799439' + prefixChar; // 22 chars
    return (prefix + num.slice(-2).padStart(2, '0')).toLowerCase(); // ensure 24 chars
}

// Function to fix a broad range of IDs in the file
function robustFix(content) {
    let prodCount = 0;
    // Fix product IDs (ensure unique suffix)
    content = content.replace(/_id: "(prod_\d+|65cf1234bcf86cd7994392\d+)"/g, (m, id) => {
        prodCount++;
        const suffix = prodCount.toString().padStart(2, '0');
        return `_id: "65cf1234bcf86cd7994392${suffix}"`;
    });

    let shopCount = 0;
    // Fix shop IDs (ensure unique suffix)
    content = content.replace(/_id: "(shop_\d+|65cf1234bcf86cd7994390\d+)"/g, (m, id) => {
        shopCount++;
        const suffix = shopCount.toString().padStart(2, '0');
        return `_id: "65cf1234bcf86cd7994390${suffix}"`;
    });

    return content;
}

content = robustFix(content);

fs.writeFileSync(filePath, content);
console.log('Successfully updated IDs in products.ts');
