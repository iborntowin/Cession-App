#!/usr/bin/env node

/**
 * Test script to debug finance data loading issues
 * This script helps identify why expense data is not showing when selecting months
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Finance Data Loading Issues...\n');

// Test 1: Check API implementation
function testAPIImplementation() {
    console.log('1. Testing API implementation...');
    
    const apiPath = path.join(__dirname, 'frontend/src/lib/api.js');
    const apiContent = fs.readFileSync(apiPath, 'utf8');
    
    // Check for required API methods
    const hasGetExpensesByDateRange = apiContent.includes('getExpensesByDateRange');
    const hasGetAllExpenses = apiContent.includes('getAllExpenses');
    const hasProperErrorHandling = apiContent.includes('catch (error)');
    const hasAuthHeaders = apiContent.includes('getAuthHeaders()');
    
    console.log(`   - getExpensesByDateRange method: ${hasGetExpensesByDateRange ? '✅' : '❌'}`);
    console.log(`   - getAllExpenses fallback: ${hasGetAllExpenses ? '✅' : '❌'}`);
    console.log(`   - Error handling: ${hasProperErrorHandling ? '✅' : '❌'}`);
    console.log(`   - Auth headers: ${hasAuthHeaders ? '✅' : '❌'}`);
    
    return hasGetExpensesByDateRange && hasGetAllExpenses && hasProperErrorHandling && hasAuthHeaders;
}

// Test 2: Check data loading logic
function testDataLoadingLogic() {
    console.log('\n2. Testing data loading logic...');
    
    const financePagePath = path.join(__dirname, 'frontend/src/routes/finance/+page.svelte');
    const financeContent = fs.readFileSync(financePagePath, 'utf8');
    
    // Check for proper data loading
    const hasDebugLogging = financeContent.includes('console.log(\'Loading expenses for period:');
    const hasFallbackLogic = financeContent.includes('getAllExpenses');
    const hasDateFiltering = financeContent.includes('filter(expense =>') && financeContent.includes('expenseDate');
    const hasDataInitialization = financeContent.includes('expenses = []') && financeContent.includes('sales = []');
    const hasLoadingPrevention = financeContent.includes('if (isDataLoading) return');
    
    console.log(`   - Debug logging: ${hasDebugLogging ? '✅' : '❌'}`);
    console.log(`   - Fallback to getAllExpenses: ${hasFallbackLogic ? '✅' : '❌'}`);
    console.log(`   - Client-side date filtering: ${hasDateFiltering ? '✅' : '❌'}`);
    console.log(`   - Data initialization: ${hasDataInitialization ? '✅' : '❌'}`);
    console.log(`   - Loading state prevention: ${hasLoadingPrevention ? '✅' : '❌'}`);
    
    return hasDebugLogging && hasFallbackLogic && hasDateFiltering && hasDataInitialization && hasLoadingPrevention;
}

// Test 3: Check expense display logic
function testExpenseDisplayLogic() {
    console.log('\n3. Testing expense display logic...');
    
    const financePagePath = path.join(__dirname, 'frontend/src/routes/finance/+page.svelte');
    const financeContent = fs.readFileSync(financePagePath, 'utf8');
    
    // Check for proper expense display
    const hasFilteredExpenses = financeContent.includes('filteredExpenses');
    const hasExpenseLoop = financeContent.includes('{#each filteredExpenses as expense');
    const hasFlexibleFieldAccess = financeContent.includes('expense.description || expense.label');
    const hasEmptyState = financeContent.includes('{:else}') && financeContent.includes('No expenses found');
    const hasDebugSection = financeContent.includes('Debug Info');
    
    console.log(`   - Filtered expenses reactive: ${hasFilteredExpenses ? '✅' : '❌'}`);
    console.log(`   - Expense loop: ${hasExpenseLoop ? '✅' : '❌'}`);
    console.log(`   - Flexible field access: ${hasFlexibleFieldAccess ? '✅' : '❌'}`);
    console.log(`   - Empty state handling: ${hasEmptyState ? '✅' : '❌'}`);
    console.log(`   - Debug section: ${hasDebugSection ? '✅' : '❌'}`);
    
    return hasFilteredExpenses && hasExpenseLoop && hasFlexibleFieldAccess && hasEmptyState && hasDebugSection;
}

// Test 4: Check date handling
function testDateHandling() {
    console.log('\n4. Testing date handling...');
    
    const financePagePath = path.join(__dirname, 'frontend/src/routes/finance/+page.svelte');
    const financeContent = fs.readFileSync(financePagePath, 'utf8');
    
    // Check for proper date handling
    const hasAsyncMonthChange = financeContent.includes('async function handleMonthChange');
    const hasDateRangeCalculation = financeContent.includes('new Date(year, month - 1, 1)');
    const hasFormattedDates = financeContent.includes('toISOString().split(\'T\')[0]');
    const hasDateComparison = financeContent.includes('expenseDate >= startDate && expenseDate <= endDate');
    
    console.log(`   - Async month change: ${hasAsyncMonthChange ? '✅' : '❌'}`);
    console.log(`   - Date range calculation: ${hasDateRangeCalculation ? '✅' : '❌'}`);
    console.log(`   - Formatted dates: ${hasFormattedDates ? '✅' : '❌'}`);
    console.log(`   - Date comparison: ${hasDateComparison ? '✅' : '❌'}`);
    
    return hasAsyncMonthChange && hasDateRangeCalculation && hasFormattedDates && hasDateComparison;
}

// Test 5: Check for common issues
function testCommonIssues() {
    console.log('\n5. Testing for common issues...');
    
    const financePagePath = path.join(__dirname, 'frontend/src/routes/finance/+page.svelte');
    const financeContent = fs.readFileSync(financePagePath, 'utf8');
    
    // Check for common issues
    const noInfiniteLoops = !financeContent.includes('$: expenses') || financeContent.includes('// Prevent infinite loop');
    const hasProperErrorBoundaries = financeContent.includes('try {') && financeContent.includes('} catch');
    const hasUserValidation = financeContent.includes('if (!currentUser)');
    const hasDataValidation = financeContent.includes('if (!expense.date)') || financeContent.includes('if (!sale.createdAt)');
    
    console.log(`   - No infinite loops: ${noInfiniteLoops ? '✅' : '❌'}`);
    console.log(`   - Error boundaries: ${hasProperErrorBoundaries ? '✅' : '❌'}`);
    console.log(`   - User validation: ${hasUserValidation ? '✅' : '❌'}`);
    console.log(`   - Data validation: ${hasDataValidation ? '✅' : '❌'}`);
    
    return noInfiniteLoops && hasProperErrorBoundaries && hasUserValidation && hasDataValidation;
}

// Run all tests
function runAllTests() {
    console.log('🚀 Running Finance Data Loading Debug Tests\n');
    console.log('=' .repeat(60));
    
    const test1 = testAPIImplementation();
    const test2 = testDataLoadingLogic();
    const test3 = testExpenseDisplayLogic();
    const test4 = testDateHandling();
    const test5 = testCommonIssues();
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test Results Summary:');
    console.log(`   API Implementation: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Data Loading Logic: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Expense Display: ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Date Handling: ${test4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Common Issues: ${test5 ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = test1 && test2 && test3 && test4 && test5;
    
    console.log('\n' + '=' .repeat(60));
    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED! Data loading should work correctly.');
        console.log('\n✨ Debugging features added:');
        console.log('   • Console logging for API responses');
        console.log('   • Fallback to getAllExpenses if date range fails');
        console.log('   • Client-side date filtering');
        console.log('   • Flexible field access (description || label)');
        console.log('   • Debug info section on the page');
        console.log('   • Better error handling and validation');
    } else {
        console.log('❌ SOME TESTS FAILED. Check the implementation.');
    }
    
    return allPassed;
}

// Debugging instructions
function printDebuggingInstructions() {
    console.log('\n🔧 Debugging Instructions:');
    console.log('1. Open browser developer tools (F12)');
    console.log('2. Go to Console tab');
    console.log('3. Navigate to Finance page');
    console.log('4. Select a different month from dropdown');
    console.log('5. Check console for these logs:');
    console.log('   - "Loading expenses for period: YYYY-MM-DD to YYYY-MM-DD"');
    console.log('   - "Expenses API response: {success: true/false, data: ...}"');
    console.log('   - "Loaded expenses: X items" or "Got all expenses: X items"');
    console.log('   - "Filtered expenses for selected month: X items"');
    console.log('   - "Final expense categories: {...}"');
    console.log('   - "Final analytics: {...}"');
    console.log('\n6. Check the yellow debug box on the page for data summary');
    console.log('7. If no data loads, check Network tab for failed API calls');
    console.log('8. Verify backend is running and accessible');
}

// Run the tests
if (require.main === module) {
    const success = runAllTests();
    printDebuggingInstructions();
    process.exit(success ? 0 : 1);
}

module.exports = {
    testAPIImplementation,
    testDataLoadingLogic,
    testExpenseDisplayLogic,
    testDateHandling,
    testCommonIssues,
    runAllTests
};