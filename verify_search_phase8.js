const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function verifySearch() {
    console.log('--- Starting Phase 8: Advanced Search Verification ---');

    try {
        // 1. Verify Search Suggestions
        console.log('\n1. Verifying Search Suggestions...');
        const suggestionsRes = await axios.get(`${API_URL}/products/suggestions?q=handicraft`);
        console.log('✓ Suggestions Response:', JSON.stringify(suggestionsRes.data.data.suggestions, null, 2));

        // 2. Verify Search Aggregations
        console.log('\n2. Verifying Search Aggregations...');
        const aggregationsRes = await axios.get(`${API_URL}/products/aggregations`);
        console.log('✓ Aggregations Meta:', {
            categories: aggregationsRes.data.data.categories?.length,
            materials: aggregationsRes.data.data.materials?.length,
            regions: aggregationsRes.data.data.regions?.length,
            priceRange: aggregationsRes.data.data.priceRange
        });

        // 3. Verify Advanced Filters (Material)
        console.log('\n3. Verifying Advanced Filters (Material: Wood)...');
        const materialRes = await axios.get(`${API_URL}/products?material=Wood`);
        console.log(`✓ Products with Material "Wood": ${materialRes.data.data.products?.length}`);

        // 4. Verify Sorting (Popularity)
        console.log('\n4. Verifying Sorting (Popularity)...');
        const sortRes = await axios.get(`${API_URL}/products?sort=popularity`);
        console.log(`✓ Sort Response Success: ${sortRes.data.message}`);

        // 5. Verify Verified Seller Filter
        console.log('\n5. Verifying Verified Seller Filter...');
        const verifiedRes = await axios.get(`${API_URL}/products?isVerifiedSeller=true`);
        console.log(`✓ Products from Verified Sellers: ${verifiedRes.data.data.products?.length}`);

        console.log('\n--- Phase 8 Verification Complete ---');
    } catch (error) {
        console.error('Verification failed:', error.response?.data || error.message);
    }
}

verifySearch();
