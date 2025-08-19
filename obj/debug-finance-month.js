// Debug script to test finance month selection
console.log('Testing finance month selection...');

// Test date parsing
function testDateParsing() {
    console.log('\n=== Testing Date Parsing ===');
    
    const testMonths = ['2024-01', '2024-08', '2025-01', '2025-08'];
    
    testMonths.forEach(selectedMonth => {
        console.log(`\nTesting month: ${selectedMonth}`);
        
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        console.log(`Year: ${year}, Month: ${month}`);
        console.log(`Start Date: ${formattedStartDate}`);
        console.log(`End Date: ${formattedEndDate}`);
        
        // Test if a sample expense would match
        const sampleExpenseDate = '2025-08-04';
        const expenseDate = new Date(sampleExpenseDate);
        const isInRange = expenseDate >= startDate && expenseDate <= endDate;
        
        console.log(`Sample expense (${sampleExpenseDate}) in range: ${isInRange}`);
    });
}

// Test API URL construction
function testAPIUrls() {
    console.log('\n=== Testing API URLs ===');
    
    const BACKEND_URL = 'http://localhost:8080'; // Assuming default
    const userId = 'fa841c39-099a-4cc8-a21f-05bfa81b5bb5';
    const selectedMonth = '2024-01';
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    const dateRangeUrl = `${BACKEND_URL}/api/v1/expenses/range?userId=${userId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}&page=0&size=1000`;
    const monthUrl = `${BACKEND_URL}/api/v1/expenses?userId=${userId}&year=${year}&month=${month}`;
    const allExpensesUrl = `${BACKEND_URL}/api/v1/expenses/all?userId=${userId}&page=0&size=1000`;
    
    console.log('Date Range URL:', dateRangeUrl);
    console.log('Month URL:', monthUrl);
    console.log('All Expenses URL:', allExpensesUrl);
}

// Run tests
testDateParsing();
testAPIUrls();

console.log('\n=== Debug Complete ===');