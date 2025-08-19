#!/usr/bin/env node

/**
 * Test script to verify finance month selection functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Finance Month Selection Issue...\n');

// Test 1: Check if the finance page has proper month change handling
function testFinancePageLogic() {
    console.log('1. Testing Finance Page Logic...');
    
    const financePath = 'frontend/src/routes/finance/+page.svelte';
    if (!fs.existsSync(financePath)) {
        console.log('   ❌ Finance page not found');
        return false;
    }
    
    const financeContent = fs.readFileSync(financePath, 'utf8');
    
    // Check for month selection logic
    const hasMonthSelector = financeContent.includes('selectedMonth') && financeContent.includes('handleMonthChange');
    const hasDateRangeCalculation = financeContent.includes('selectedMonth.split(\'-\')') && financeContent.includes('new Date(year, month - 1, 1)');
    const hasProperDataReload = financeContent.includes('await loadData()') && financeContent.includes('handleMonthChange');
    const hasDebugInfo = financeContent.includes('Debug Info') && financeContent.includes('selectedMonth');
    
    console.log(`   - Month selector: ${hasMonthSelector ? '✅' : '❌'}`);
    console.log(`   - Date range calculation: ${hasDateRangeCalculation ? '✅' : '❌'}`);
    console.log(`   - Data reload on change: ${hasProperDataReload ? '✅' : '❌'}`);
    console.log(`   - Debug information: ${hasDebugInfo ? '✅' : '❌'}`);
    
    return hasMonthSelector && hasDateRangeCalculation && hasProperDataReload;
}

// Test 2: Check API consistency
function testAPIConsistency() {
    console.log('\n2. Testing API Consistency...');
    
    const apiPath = 'frontend/src/lib/api.js';
    if (!fs.existsSync(apiPath)) {
        console.log('   ❌ API file not found');
        return false;
    }
    
    const apiContent = fs.readFileSync(apiPath, 'utf8');
    
    // Check for financial API methods
    const hasFinancialApi = apiContent.includes('export const financialApi');
    const hasDateRangeMethod = apiContent.includes('getExpensesByDateRange');
    const hasMonthMethod = apiContent.includes('getExpensesByMonth');
    const hasAllExpensesMethod = apiContent.includes('getAllExpenses');
    const hasProperErrorHandling = apiContent.includes('catch (error)') && apiContent.includes('console.error');
    
    console.log(`   - Financial API export: ${hasFinancialApi ? '✅' : '❌'}`);
    console.log(`   - Date range method: ${hasDateRangeMethod ? '✅' : '❌'}`);
    console.log(`   - Month method: ${hasMonthMethod ? '✅' : '❌'}`);
    console.log(`   - All expenses fallback: ${hasAllExpensesMethod ? '✅' : '❌'}`);
    console.log(`   - Error handling: ${hasProperErrorHandling ? '✅' : '❌'}`);
    
    return hasFinancialApi && hasDateRangeMethod && hasMonthMethod && hasAllExpensesMethod;
}

// Test 3: Check backend controller
function testBackendController() {
    console.log('\n3. Testing Backend Controller...');
    
    const controllerPath = 'backend/src/main/java/com/example/cessionappbackend/controllers/ExpenseController.java';
    if (!fs.existsSync(controllerPath)) {
        console.log('   ❌ Expense controller not found');
        return false;
    }
    
    const controllerContent = fs.readFileSync(controllerPath, 'utf8');
    
    // Check for required endpoints
    const hasRangeEndpoint = controllerContent.includes('@GetMapping("/range")') && controllerContent.includes('getExpensesByDateRange');
    const hasMonthEndpoint = controllerContent.includes('@GetMapping') && controllerContent.includes('getExpensesByMonth');
    const hasAllEndpoint = controllerContent.includes('@GetMapping("/all")') && controllerContent.includes('getAllExpenses');
    const hasCategoryEndpoint = controllerContent.includes('@GetMapping("/categories")') && controllerContent.includes('getExpensesByCategory');
    
    console.log(`   - Date range endpoint: ${hasRangeEndpoint ? '✅' : '❌'}`);
    console.log(`   - Month endpoint: ${hasMonthEndpoint ? '✅' : '❌'}`);
    console.log(`   - All expenses endpoint: ${hasAllEndpoint ? '✅' : '❌'}`);
    console.log(`   - Category endpoint: ${hasCategoryEndpoint ? '✅' : '❌'}`);
    
    return hasRangeEndpoint && hasMonthEndpoint && hasAllEndpoint && hasCategoryEndpoint;
}

// Test 4: Identify potential issues
function identifyIssues() {
    console.log('\n4. Identifying Potential Issues...');
    
    const financePath = 'frontend/src/routes/finance/+page.svelte';
    const financeContent = fs.readFileSync(financePath, 'utf8');
    
    const issues = [];
    
    // Check for common issues
    if (!financeContent.includes('selectedMonth !== newMonth')) {
        issues.push('Month change comparison might be missing');
    }
    
    if (!financeContent.includes('isDataLoading')) {
        issues.push('Loading state management might be missing');
    }
    
    if (financeContent.includes('new Date().toISOString().slice(0, 7)') && !financeContent.includes('selectedMonth = newMonth')) {
        issues.push('Month state might not be updating properly');
    }
    
    // Check for data filtering issues
    if (!financeContent.includes('filter(expense =>') || !financeContent.includes('expenseDate >= startDate && expenseDate <= endDate')) {
        issues.push('Client-side date filtering might be incorrect');
    }
    
    if (issues.length === 0) {
        console.log('   ✅ No obvious issues found in the code structure');
    } else {
        issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
    }
    
    return issues;
}

// Run all tests
const test1 = testFinancePageLogic();
const test2 = testAPIConsistency();
const test3 = testBackendController();
const issues = identifyIssues();

console.log('\n📊 Test Summary:');
console.log(`   Finance Page Logic: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   API Consistency: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Backend Controller: ${test3 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`   Issues Found: ${issues.length}`);

if (test1 && test2 && test3 && issues.length === 0) {
    console.log('\n✨ All tests passed! The issue might be in the data flow or API responses.');
    console.log('\n🔧 Recommended next steps:');
    console.log('   1. Check browser network tab for API responses');
    console.log('   2. Verify backend database has data for different months');
    console.log('   3. Add more detailed logging to track data flow');
} else {
    console.log('\n🔧 Issues found that need to be fixed:');
    if (!test1) console.log('   - Fix finance page month selection logic');
    if (!test2) console.log('   - Fix API method consistency');
    if (!test3) console.log('   - Fix backend controller endpoints');
    if (issues.length > 0) console.log('   - Address the identified code issues');
}

console.log('\n🎯 Focus on: The month selection should trigger a complete data reload with proper date filtering.');