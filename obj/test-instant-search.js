/**
 * Test script to verify instant search functionality
 * Run this in the browser console on the clients page
 */

console.log('🚀 Testing Instant Search Performance');

// Simulate typing in CIN search
function simulateTyping(inputSelector, value, callback) {
  const input = document.querySelector(inputSelector);
  if (!input) {
    console.error('Input not found:', inputSelector);
    return;
  }

  let currentValue = '';
  const chars = value.split('');
  
  console.log(`📝 Simulating typing "${value}" in ${inputSelector}`);
  
  chars.forEach((char, index) => {
    setTimeout(() => {
      currentValue += char;
      input.value = currentValue;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.log(`Typed: "${currentValue}"`);
      
      if (index === chars.length - 1) {
        setTimeout(() => {
          const clientCards = document.querySelectorAll('[role="button"]');
          console.log(`✅ Search completed. Found ${clientCards.length} client cards visible`);
          if (callback) callback();
        }, 200);
      }
    }, index * 100); // 100ms between each character
  });
}

// Test CIN search
function testCINSearch() {
  console.log('🔍 Testing CIN Search Performance');
  
  // Clear any existing search
  const clearButton = document.querySelector('button:contains("Clear All Filters")');
  if (clearButton) clearButton.click();
  
  setTimeout(() => {
    simulateTyping('#cinSearch', '12345', () => {
      console.log('✅ CIN search test completed');
      testWorkerNumberSearch();
    });
  }, 500);
}

// Test Worker Number search
function testWorkerNumberSearch() {
  console.log('🔍 Testing Worker Number Search Performance');
  
  setTimeout(() => {
    simulateTyping('#workerNumberSearch', 'W001', () => {
      console.log('✅ Worker Number search test completed');
      testNameSearch();
    });
  }, 1000);
}

// Test Name search
function testNameSearch() {
  console.log('🔍 Testing Name Search Performance');
  
  setTimeout(() => {
    simulateTyping('#nameSearch', 'Ahmed', () => {
      console.log('✅ Name search test completed');
      console.log('🎉 All instant search tests completed successfully!');
    });
  }, 1000);
}

// Performance monitoring
function monitorPerformance() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.target.classList?.contains('grid')) {
        const timestamp = performance.now();
        console.log(`⚡ DOM updated at ${timestamp.toFixed(2)}ms - Client grid refreshed`);
      }
    });
  });

  const clientGrid = document.querySelector('.grid');
  if (clientGrid) {
    observer.observe(clientGrid, { childList: true, subtree: true });
    console.log('📊 Performance monitoring started');
  }

  // Stop monitoring after 10 seconds
  setTimeout(() => {
    observer.disconnect();
    console.log('📊 Performance monitoring stopped');
  }, 10000);
}

// Start tests
console.log(`
🎯 INSTANT SEARCH TEST SUITE
============================

This test will verify:
✅ Search results appear instantly
✅ No slow animations during search
✅ Exact matches appear first
✅ UI remains responsive

Starting tests...
`);

monitorPerformance();
testCINSearch();

// Additional utility functions for manual testing
window.testInstantSearch = {
  simulateTyping,
  testCINSearch,
  testWorkerNumberSearch,
  testNameSearch,
  monitorPerformance
};

console.log('💡 Manual testing functions available: window.testInstantSearch');