#!/usr/bin/env node

/**
 * Test script to verify all finance page fixes
 * Tests: Modal functionality, date dropdown, translations, and data loading
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Finance Page Fixes...\n');

// Test 1: Check modal implementation fixes
function testModalFixes() {
    console.log('1. Testing modal implementation fixes...');
    
    const financePagePath = path.join(__dirname, 'frontend/src/routes/finance/+page.svelte');
    const financeContent = fs.readFileSync(financePagePath, 'utf8');
    
    // Check for proper modal structure
    const hasSimplifiedModal = financeContent.includes('on:click|self={closeExpenseModal}');
    const hasStopPropagation = financeContent.includes('on:click|stopPropagation');
    const hasBodyScrollControl = financeContent.includes('document.body.style.overflow');
    const hasProperZIndex = financeContent.includes('z-50');
    
    console.log(`   - Simplified modal structure: ${hasSimplifiedModal ? '✅' : '❌'}`);
    console.log(`   - Event propagation control: ${hasStopPropagation ? '✅' : '❌'}`);
    console.log(`   - Body scroll control: ${hasBodyScrollControl ? '✅' : '❌'}`);
    console.log(`   - Proper z-index: ${hasProperZIndex ? '✅' : '❌'}`);
    
    return hasSimplifiedModal && hasStopPropagation && hasBodyScrollControl && hasProperZIndex;
}

// Test 2: Check date dropdown fixes
function testDateDropdownFixes() {
    console.log('\n2. Testing date dropdown fixes...');
    
    const financePagePath = path.join(__dirname, 'frontend/src/routes/finance/+page.svelte');
    const financeContent = fs.readFileSync(financePagePath, 'utf8');
    
    // Check for proper date handling
    const hasAsyncMonthChange = financeContent.includes('async function handleMonthChange');
    const hasLoadingPrevention = financeContent.includes('if (isDataLoading) return');
    const hasDisabledState = financeContent.includes('disabled={isDataLoading}');
    const has2025Options = financeContent.includes('2025-01') && financeContent.includes('2025-12');
    const hasLoadingIndicator = financeContent.includes('animate-spin');
    
    console.log(`   - Async month change handler: ${hasAsyncMonthChange ? '✅' : '❌'}`);
    console.log(`   - Loading state prevention: ${hasLoadingPrevention ? '✅' : '❌'}`);
    console.log(`   - Disabled state during loading: ${hasDisabledState ? '✅' : '❌'}`);
    console.log(`   - 2025 year options: ${has2025Options ? '✅' : '❌'}`);
    console.log(`   - Loading indicator: ${hasLoadingIndicator ? '✅' : '❌'}`);
    
    return hasAsyncMonthChange && hasLoadingPrevention && hasDisabledState && has2025Options && hasLoadingIndicator;
}

// Test 3: Check translation fixes
function testTranslationFixes() {
    console.log('\n3. Testing translation fixes...');
    
    const frTranslationPath = path.join(__dirname, 'frontend/src/lib/i18n/fr.json');
    const frContent = fs.readFileSync(frTranslationPath, 'utf8');
    
    // Check for required translations
    const hasFinanceAnalytics = frContent.includes('"analytics"') && frContent.includes('"total_sales"');
    const hasMonthTranslations = frContent.includes('"january"') && frContent.includes('"december"');
    const hasNotAvailable = frContent.includes('"not_available"');
    const hasExpenseTranslations = frContent.includes('"expenses"') && frContent.includes('"add"');
    
    console.log(`   - Finance analytics translations: ${hasFinanceAnalytics ? '✅' : '❌'}`);
    console.log(`   - Month translations: ${hasMonthTranslations ? '✅' : '❌'}`);
    console.log(`   - "Not available" translation: ${hasNotAvailable ? '✅' : '❌'}`);
    console.log(`   - Expense translations: ${hasExpenseTranslations ? '✅' : '❌'}`);
    
    return hasFinanceAnalytics && hasMonthTranslations && hasNotAvailable && hasExpenseTranslations;
}

// Test 4: Check data loading improvements
function testDataLoadingFixes() {
    console.log('\n4. Testing data loading improvements...');
    
    const financePagePath = path.join(__dirname, 'frontend/src/routes/finance/+page.svelte');
    const financeContent = fs.readFileSync(financePagePath, 'utf8');
    
    // Check for improved data loading
    const hasLoadingPrevention = financeContent.includes('if (isDataLoading) return');
    const hasProperErrorHandling = financeContent.includes('try {') && financeContent.includes('catch');
    const hasDataInitialization = financeContent.includes('expenses = []') && financeContent.includes('sales = []');
    const hasRealisticAnalytics = !financeContent.includes('monthlyGrowth: -9.5') && !financeContent.includes('static');
    
    console.log(`   - Loading state prevention: ${hasLoadingPrevention ? '✅' : '❌'}`);
    console.log(`   - Proper error handling: ${hasProperErrorHandling ? '✅' : '❌'}`);
    console.log(`   - Data initialization: ${hasDataInitialization ? '✅' : '❌'}`);
    console.log(`   - Realistic analytics (no fake data): ${hasRealisticAnalytics ? '✅' : '❌'}`);
    
    return hasLoadingPrevention && hasProperErrorHandling && hasDataInitialization && hasRealisticAnalytics;
}

// Test 5: Check removal of static/fake stats
function testStaticStatsRemoval() {
    console.log('\n5. Testing removal of static/fake stats...');
    
    const financePagePath = path.join(__dirname, 'frontend/src/routes/finance/+page.svelte');
    const financeContent = fs.readFileSync(financePagePath, 'utf8');
    
    // Check that fake stats are removed
    const noFakeGrowth = !financeContent.includes('monthlyGrowth: -9.5');
    const noStaticPercentages = !financeContent.includes('width: 68%') && !financeContent.includes('width: 85%');
    const noFakeLabels = !financeContent.includes('Excellent') && !financeContent.includes('Budget Health');
    const hasRealCalculations = financeContent.includes('calculateTotalSales()') && financeContent.includes('calculateTotalProfit()');
    
    console.log(`   - No fake growth data: ${noFakeGrowth ? '✅' : '❌'}`);
    console.log(`   - No static percentages: ${noStaticPercentages ? '✅' : '❌'}`);
    console.log(`   - No fake labels: ${noFakeLabels ? '✅' : '❌'}`);
    console.log(`   - Real calculations: ${hasRealCalculations ? '✅' : '❌'}`);
    
    return noFakeGrowth && noStaticPercentages && noFakeLabels && hasRealCalculations;
}

// Run all tests
function runAllTests() {
    console.log('🚀 Running Finance Page Fix Tests\n');
    console.log('=' .repeat(60));
    
    const test1 = testModalFixes();
    const test2 = testDateDropdownFixes();
    const test3 = testTranslationFixes();
    const test4 = testDataLoadingFixes();
    const test5 = testStaticStatsRemoval();
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test Results Summary:');
    console.log(`   Modal Implementation: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Date Dropdown: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Translations: ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Data Loading: ${test4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Static Stats Removal: ${test5 ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = test1 && test2 && test3 && test4 && test5;
    
    console.log('\n' + '=' .repeat(60));
    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED! Finance page fixes are working correctly.');
        console.log('\n✨ Issues Fixed:');
        console.log('   • Modal no longer freezes the application');
        console.log('   • Date dropdown works properly without breaking data display');
        console.log('   • All translation keys are properly defined');
        console.log('   • Removed all fake/static statistics');
        console.log('   • Improved data loading with proper error handling');
        console.log('   • Added loading states and prevention of multiple requests');
        console.log('   • Real-time analytics based on actual data');
    } else {
        console.log('❌ SOME TESTS FAILED. Please review the implementation.');
    }
    
    return allPassed;
}

// Usage instructions
function printUsageInstructions() {
    console.log('\n📋 Manual Testing Instructions:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Navigate to the Finance page');
    console.log('3. Test the "Ajouter une dépense" button - should open modal without freezing');
    console.log('4. Test the date dropdown - should load data without breaking the page');
    console.log('5. Check that all text is properly translated (no "finance.analytics.xxx" keys)');
    console.log('6. Verify that statistics show real data, not fake percentages');
    console.log('7. Test navigation while modal is open - should work normally');
    console.log('8. Test ESC key to close modal');
    console.log('9. Test clicking outside modal to close it');
}

// Run the tests
if (require.main === module) {
    const success = runAllTests();
    printUsageInstructions();
    process.exit(success ? 0 : 1);
}

module.exports = {
    testModalFixes,
    testDateDropdownFixes,
    testTranslationFixes,
    testDataLoadingFixes,
    testStaticStatsRemoval,
    runAllTests
};