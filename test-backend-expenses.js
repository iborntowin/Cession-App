// Test script to check backend expense API
const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:8080';
const USER_ID = 'fa841c39-099a-4cc8-a21f-05bfa81b5bb5';

// You'll need to replace this with a valid JWT token
const TOKEN = 'your-jwt-token-here';

async function testExpenseAPIs() {
    console.log('Testing expense APIs...');
    
    const headers = {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
    };
    
    try {
        // Test 1: Get all expenses
        console.log('\n=== Test 1: All Expenses ===');
        const allExpensesUrl = `${BACKEND_URL}/api/v1/expenses/all?userId=${USER_ID}&page=0&size=100`;
        console.log('URL:', allExpensesUrl);
        
        const allResponse = await fetch(allExpensesUrl, { headers });
        const allData = await allResponse.json();
        console.log('Status:', allResponse.status);
        console.log('Response:', JSON.stringify(allData, null, 2));
        
        // Test 2: Get expenses for January 2025
        console.log('\n=== Test 2: January 2025 Expenses ===');
        const jan2025Url = `${BACKEND_URL}/api/v1/expenses/range?userId=${USER_ID}&startDate=2025-01-01&endDate=2025-01-31&page=0&size=100`;
        console.log('URL:', jan2025Url);
        
        const jan2025Response = await fetch(jan2025Url, { headers });
        const jan2025Data = await jan2025Response.json();
        console.log('Status:', jan2025Response.status);
        console.log('Response:', JSON.stringify(jan2025Data, null, 2));
        
        // Test 3: Get expenses for August 2025
        console.log('\n=== Test 3: August 2025 Expenses ===');
        const aug2025Url = `${BACKEND_URL}/api/v1/expenses/range?userId=${USER_ID}&startDate=2025-08-01&endDate=2025-08-31&page=0&size=100`;
        console.log('URL:', aug2025Url);
        
        const aug2025Response = await fetch(aug2025Url, { headers });
        const aug2025Data = await aug2025Response.json();
        console.log('Status:', aug2025Response.status);
        console.log('Response:', JSON.stringify(aug2025Data, null, 2));
        
    } catch (error) {
        console.error('Error testing APIs:', error);
    }
}

// Note: This script requires a valid JWT token to work
console.log('Note: You need to replace TOKEN with a valid JWT token from your browser');
console.log('You can get it from the browser dev tools -> Application -> Local Storage');

// Uncomment the line below and add a valid token to run the test
// testExpenseAPIs();