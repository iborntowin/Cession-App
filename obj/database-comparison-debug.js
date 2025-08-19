/**
 * Comprehensive Database Comparison Debug Script
 * This script will help identify why danger clients results differ between environments
 */

const BACKEND_URL = 'http://localhost:8082';

async function makeAuthenticatedRequest(endpoint, token) {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
}

async function comprehensiveDatabaseAnalysis(token) {
    console.log('=== COMPREHENSIVE DATABASE ANALYSIS ===');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Current time:', new Date().toISOString());
    console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    try {
        // 1. Get debug info from backend
        console.log('\n--- BACKEND DEBUG INFO ---');
        const debugInfo = await makeAuthenticatedRequest('/api/v1/payments/debug-info', token);
        console.log('Backend Debug Info:', JSON.stringify(debugInfo, null, 2));
        
        // 2. Get all clients
        console.log('\n--- CLIENTS ANALYSIS ---');
        const clients = await makeAuthenticatedRequest('/api/v1/clients', token);
        console.log(`Total clients: ${clients.length}`);
        
        if (clients.length > 0) {
            console.log('Sample client:', JSON.stringify(clients[0], null, 2));
        }
        
        // 3. Get all cessions
        console.log('\n--- CESSIONS ANALYSIS ---');
        const cessions = await makeAuthenticatedRequest('/api/v1/cessions', token);
        console.log(`Total cessions: ${cessions.length}`);
        
        // Analyze cession statuses
        const statusCounts = {};
        const startDateAnalysis = {};
        
        cessions.forEach(cession => {
            // Status analysis
            const status = cession.status || 'null';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            
            // Start date analysis
            if (cession.startDate) {
                const year = cession.startDate.substring(0, 4);
                startDateAnalysis[year] = (startDateAnalysis[year] || 0) + 1;
            }
        });
        
        console.log('Cession statuses:', statusCounts);
        console.log('Cessions by start year:', startDateAnalysis);
        
        // Find active cessions
        const activeCessions = cessions.filter(c => 
            ['ACTIVE', 'active', 'in_progress'].includes(c.status)
        );
        console.log(`Active cessions: ${activeCessions.length}`);
        
        if (activeCessions.length > 0) {
            console.log('Sample active cession:', JSON.stringify(activeCessions[0], null, 2));
            
            // Analyze start dates of active cessions
            console.log('\nActive cessions start dates:');
            activeCessions.forEach((cession, index) => {
                if (index < 5) { // Show first 5
                    const monthsElapsed = calculateMonthsElapsed(cession.startDate);
                    console.log(`- ${cession.clientName}: ${cession.startDate} (${monthsElapsed} months ago) - Monthly: ${cession.monthlyPayment}`);
                }
            });
        }
        
        // 4. Get all payments
        console.log('\n--- PAYMENTS ANALYSIS ---');
        const payments = await makeAuthenticatedRequest('/api/v1/payments', token);
        console.log(`Total payments: ${payments.length}`);
        
        if (payments.length > 0) {
            console.log('Sample payment:', JSON.stringify(payments[0], null, 2));
            
            // Analyze payment dates
            const paymentsByMonth = {};
            payments.forEach(payment => {
                if (payment.paymentDate) {
                    const monthKey = payment.paymentDate.substring(0, 7); // YYYY-MM
                    paymentsByMonth[monthKey] = (paymentsByMonth[monthKey] || 0) + 1;
                }
            });
            
            console.log('Payments by month (last 12 months):');
            Object.entries(paymentsByMonth)
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 12)
                .forEach(([month, count]) => {
                    console.log(`- ${month}: ${count} payments`);
                });
        }
        
        // 5. Manual danger clients calculation
        console.log('\n--- MANUAL DANGER CLIENTS CALCULATION ---');
        const now = new Date();
        const dangerClientsManual = [];
        
        activeCessions.forEach(cession => {
            if (!cession.monthlyPayment || cession.monthlyPayment <= 0) {
                return;
            }
            
            const startDate = new Date(cession.startDate);
            const monthsElapsed = calculateMonthsElapsed(cession.startDate);
            
            // Get payments for this cession
            const cessionPayments = payments.filter(p => p.cessionId === cession.id);
            const totalPaid = cessionPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const paidMonths = Math.floor(totalPaid / cession.monthlyPayment);
            const missedMonths = Math.max(0, monthsElapsed - paidMonths);
            
            console.log(`\nCession ${cession.id}:`);
            console.log(`- Client: ${cession.clientName}`);
            console.log(`- Start: ${cession.startDate}`);
            console.log(`- Months elapsed: ${monthsElapsed}`);
            console.log(`- Monthly payment: ${cession.monthlyPayment}`);
            console.log(`- Total paid: ${totalPaid}`);
            console.log(`- Paid months: ${paidMonths}`);
            console.log(`- Missed months: ${missedMonths}`);
            console.log(`- Payments count: ${cessionPayments.length}`);
            
            if (missedMonths >= 1) {
                dangerClientsManual.push({
                    cessionId: cession.id,
                    clientName: cession.clientName,
                    missedMonths,
                    severity: missedMonths >= 3 ? 'critical' : missedMonths >= 2 ? 'danger' : 'warning'
                });
            }
        });
        
        console.log(`\nManual calculation found ${dangerClientsManual.length} danger clients:`);
        dangerClientsManual.forEach(client => {
            console.log(`- ${client.clientName}: ${client.missedMonths} months (${client.severity})`);
        });
        
        // 6. Get API danger clients result
        console.log('\n--- API DANGER CLIENTS RESULT ---');
        const apiResult = await makeAuthenticatedRequest('/api/v1/payments/danger-clients-analysis?thresholdMonths=1', token);
        console.log('API Result:', JSON.stringify(apiResult, null, 2));
        
        // 7. Compare results
        console.log('\n--- COMPARISON ---');
        console.log(`Manual calculation: ${dangerClientsManual.length} danger clients`);
        console.log(`API result: ${apiResult.totalDangerClients || 0} danger clients`);
        
        if (dangerClientsManual.length !== (apiResult.totalDangerClients || 0)) {
            console.log('❌ MISMATCH DETECTED!');
            console.log('This indicates a problem with the backend calculation logic or data access.');
        } else {
            console.log('✅ Results match - the issue might be elsewhere.');
        }
        
    } catch (error) {
        console.error('Analysis failed:', error);
        console.error('Make sure:');
        console.error('1. Backend is running on', BACKEND_URL);
        console.error('2. You have a valid JWT token');
        console.error('3. You are logged in as an admin user');
    }
}

function calculateMonthsElapsed(startDateStr) {
    const startDate = new Date(startDateStr);
    const now = new Date();
    
    const yearDiff = now.getFullYear() - startDate.getFullYear();
    const monthDiff = now.getMonth() - startDate.getMonth();
    
    return Math.max(0, yearDiff * 12 + monthDiff);
}

// Instructions
console.log(`
USAGE INSTRUCTIONS:
1. Make sure your backend is running
2. Get a valid JWT token by logging into the app
3. Replace 'YOUR_JWT_TOKEN_HERE' below with your actual token
4. Run: node database-comparison-debug.js

To get your JWT token:
1. Open browser dev tools (F12)
2. Go to Application/Storage tab
3. Look for localStorage or sessionStorage
4. Find the 'token' or 'auth_token' entry
5. Copy the token value (without quotes)
`);

// Uncomment and add your token to run the analysis
// const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';
// comprehensiveDatabaseAnalysis(JWT_TOKEN);

module.exports = { comprehensiveDatabaseAnalysis, calculateMonthsElapsed };