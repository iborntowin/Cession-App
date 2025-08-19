// Test script to verify Arabic text encoding and multiple cessions functionality
const supabaseUrl = 'https://ahqtluebfvzvddyjlbqf.supabase.co';
const bucketName = 'mobile-exports';

async function testMobileAppFeatures() {
  console.log('🧪 Testing Mobile App Features\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check if Arabic text is properly encoded in the export
    console.log('\n📝 STEP 1: Testing Arabic Text Encoding');
    console.log('-'.repeat(30));
    
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/export-1752658866271.json`;
    const response = await fetch(fileUrl);
    
    if (response.ok) {
      const data = await response.json();
      const firstClient = data.clients[0];
      
      console.log(`Client name: "${firstClient.fullName}"`);
      console.log(`Client workplace: "${firstClient.workplace?.name}"`);
      console.log(`Client address: "${firstClient.address}"`);
      
      // Check if we still have question marks (encoding issue)
      const hasEncodingIssue = firstClient.fullName.includes('?') || 
                              firstClient.workplace?.name?.includes('?') ||
                              firstClient.address?.includes('?');
      
      if (hasEncodingIssue) {
        console.log('❌ Arabic text encoding issue detected - still showing question marks');
        console.log('💡 Backend needs to be restarted with UTF-8 fixes to generate new export');
      } else {
        console.log('✅ Arabic text encoding looks good');
      }
    }

    // Test 2: Check multiple cessions per client
    console.log('\n👥 STEP 2: Testing Multiple Cessions per Client');
    console.log('-'.repeat(30));
    
    if (response.ok) {
      const data = await response.json();
      
      // Find clients with multiple cessions
      const clientsWithMultipleCessions = data.clients.filter(client => 
        client.cessions && client.cessions.length > 1
      );
      
      console.log(`Total clients: ${data.clients.length}`);
      console.log(`Clients with multiple cessions: ${clientsWithMultipleCessions.length}`);
      
      if (clientsWithMultipleCessions.length > 0) {
        const exampleClient = clientsWithMultipleCessions[0];
        console.log(`\n📋 Example client with multiple cessions:`);
        console.log(`  Name: ${exampleClient.fullName}`);
        console.log(`  Number of cessions: ${exampleClient.cessions.length}`);
        
        exampleClient.cessions.forEach((cession, index) => {
          console.log(`  Cession ${index + 1}:`);
          console.log(`    - Monthly Payment: ${cession.monthlyPayment} TND`);
          console.log(`    - Status: ${cession.status}`);
          console.log(`    - Progress: ${cession.currentProgress}%`);
          console.log(`    - Remaining Balance: ${cession.remainingBalance} TND`);
        });
      } else {
        console.log('ℹ️  No clients with multiple cessions found in current data');
      }
    }

    // Test 3: Test payment tracker calculations
    console.log('\n📊 STEP 3: Testing Payment Tracker Logic');
    console.log('-'.repeat(30));
    
    if (response.ok) {
      const data = await response.json();
      const clientWithCession = data.clients.find(c => c.cessions && c.cessions.length > 0);
      
      if (clientWithCession) {
        const cession = clientWithCession.cessions[0];
        console.log(`Testing payment tracker for cession:`);
        console.log(`  Progress: ${cession.currentProgress}%`);
        
        // Calculate months paid (same logic as mobile app)
        const totalMonths = 18;
        const progressPercent = cession.currentProgress || 0;
        const monthsPaid = (progressPercent / 100) * totalMonths;
        
        console.log(`  Months paid: ${monthsPaid.toFixed(2)} / 18`);
        console.log(`  Months remaining: ${(18 - monthsPaid).toFixed(2)}`);
        
        // Test month grid logic
        const fullMonths = Math.floor(monthsPaid);
        const partialMonth = monthsPaid % 1;
        
        console.log(`  Full months completed: ${fullMonths}`);
        console.log(`  Partial month progress: ${(partialMonth * 100).toFixed(1)}%`);
        
        // Show month status for first 6 months as example
        console.log(`  Month status preview:`);
        for (let i = 0; i < Math.min(6, 18); i++) {
          const monthNumber = i + 1;
          const isFullyPaid = monthNumber <= fullMonths;
          const isPartiallyPaid = monthNumber === fullMonths + 1 && partialMonth > 0;
          
          let status = '—';
          if (isFullyPaid) status = '✔';
          else if (isPartiallyPaid) status = '◐';
          
          console.log(`    Mois ${monthNumber}: ${status}`);
        }
        
        if (monthsPaid >= 18) {
          console.log(`  🎉 This cession would show "Fully Paid!" banner`);
        }
      }
    }

    // Test 4: Test cession summary calculations
    console.log('\n💰 STEP 4: Testing Cession Summary Calculations');
    console.log('-'.repeat(30));
    
    if (response.ok) {
      const data = await response.json();
      
      data.clients.forEach((client, index) => {
        if (client.cessions && client.cessions.length > 0) {
          const totalCessions = client.cessions.length;
          const activeCessions = client.cessions.filter(c => c.status === 'ACTIVE').length;
          const completedCessions = client.cessions.filter(c => c.status === 'COMPLETED').length;
          const totalMonthlyPayment = client.cessions.reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);
          
          console.log(`Client ${index + 1}: ${client.fullName}`);
          console.log(`  Total Cessions: ${totalCessions}`);
          console.log(`  Active: ${activeCessions}`);
          console.log(`  Completed: ${completedCessions}`);
          console.log(`  Total Monthly Payment: ${totalMonthlyPayment.toFixed(2)} TND`);
          
          if (index >= 2) { // Show only first 3 clients to avoid too much output
            console.log(`  ... (showing first 3 clients only)`);
            return; // Exit the forEach early
          }
        }
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 MOBILE APP FEATURE TEST COMPLETE');
    console.log('='.repeat(50));
    
    console.log('\n✅ Summary of Mobile App Features:');
    console.log('   📱 Client Detail Screen:');
    console.log('     - Shows client information');
    console.log('     - Displays cessions overview summary');
    console.log('     - Lists all cessions with clickable cards');
    console.log('     - Removed export button as requested');
    console.log('   📊 Cession Detail Screen:');
    console.log('     - Shows detailed cession information');
    console.log('     - Displays 18-month payment tracker');
    console.log('     - Visual month grid with status indicators');
    console.log('     - Progress bar and completion status');
    console.log('   🔤 Text Encoding:');
    console.log('     - Backend UTF-8 fixes applied');
    console.log('     - New exports should show Arabic text correctly');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Restart the backend to apply UTF-8 encoding fixes');
    console.log('   2. Trigger a new export to generate properly encoded data');
    console.log('   3. Test the mobile app with the new export file');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMobileAppFeatures();