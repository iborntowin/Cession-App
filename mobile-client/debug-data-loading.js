#!/usr/bin/env node

/**
 * Debug script to test data loading from Supabase
 */

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://ahqtluebfvzvddyjlbqf.supabase.co';
const BUCKET_NAME = 'mobile-exports';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocXRsdWViZnZ6dmRkeWpsYnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk0MzEyNywiZXhwIjoyMDY0NTE5MTI3fQ.UK47VG5WVDSO4ifXYAHG2eb0rDVD89Hro0lVJsG4auk';

async function testDataLoading() {
  console.log('🔍 Testing Supabase data loading...\n');

  try {
    // Step 1: List files in bucket
    console.log('📁 Step 1: Listing files in bucket...');
    const listUrl = `${SUPABASE_URL}/storage/v1/object/list/${BUCKET_NAME}`;
    
    const listResponse = await fetch(listUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        limit: 100,
        prefix: '',
        sortBy: { column: 'created_at', order: 'desc' }
      })
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to list files: ${listResponse.status}`);
    }

    const files = await listResponse.json();
    console.log(`   ✓ Found ${files.length} files in bucket`);
    
    if (files.length === 0) {
      console.log('   ❌ No files found in bucket!');
      return;
    }

    // Show all files
    console.log('   📄 Files found:');
    files.forEach((file, index) => {
      console.log(`      ${index + 1}. ${file.name} (${file.created_at})`);
    });

    // Step 2: Find export files
    console.log('\n📊 Step 2: Finding export files...');
    const exportFiles = files.filter(f => f.name && (
      f.name.startsWith('export-') ||
      f.name.startsWith('mobile-export_') ||
      f.name.includes('export')
    ) && f.name.endsWith('.json'));

    if (exportFiles.length === 0) {
      console.log('   ❌ No export files found!');
      return;
    }

    console.log(`   ✓ Found ${exportFiles.length} export files`);
    exportFiles.forEach((file, index) => {
      console.log(`      ${index + 1}. ${file.name}`);
    });

    // Step 3: Load the most recent export file
    const latestFile = exportFiles[0];
    console.log(`\n📥 Step 3: Loading data from ${latestFile.name}...`);
    
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${latestFile.name}`;
    console.log(`   🔗 URL: ${fileUrl}`);

    const dataResponse = await fetch(fileUrl);
    if (!dataResponse.ok) {
      throw new Error(`Failed to fetch data: ${dataResponse.status}`);
    }

    const data = await dataResponse.json();
    console.log('   ✓ Data loaded successfully');

    // Step 4: Analyze data structure
    console.log('\n🔍 Step 4: Analyzing data structure...');
    console.log(`   📊 Data keys: ${Object.keys(data).join(', ')}`);
    
    if (data.metadata) {
      console.log('   📋 Metadata found:');
      console.log(`      Export time: ${data.metadata.exportTimestamp || data.metadata.exportTime}`);
      console.log(`      Version: ${data.metadata.version}`);
      if (data.metadata.recordCount) {
        console.log(`      Record count: ${JSON.stringify(data.metadata.recordCount)}`);
      }
    }

    if (data.clients) {
      console.log(`   👥 Clients: ${data.clients.length} found`);
      if (data.clients.length > 0) {
        const firstClient = data.clients[0];
        console.log('      First client structure:');
        console.log(`         ID: ${firstClient.id}`);
        console.log(`         Name: ${firstClient.fullName}`);
        console.log(`         CIN: ${firstClient.cin}`);
        console.log(`         Client Number: ${firstClient.clientNumber}`);
        console.log(`         Cessions: ${firstClient.cessions ? firstClient.cessions.length : 0}`);
        
        if (firstClient.cessions && firstClient.cessions.length > 0) {
          const firstCession = firstClient.cessions[0];
          console.log('         First cession structure:');
          console.log(`            ID: ${firstCession.id}`);
          console.log(`            Status: ${firstCession.status}`);
          console.log(`            Monthly Payment: ${firstCession.monthlyPayment}`);
          console.log(`            Remaining Balance: ${firstCession.remainingBalance}`);
        }
      }
    } else {
      console.log('   ❌ No clients array found in data!');
    }

    // Step 5: Test data transformation
    console.log('\n🔄 Step 5: Testing data transformation...');
    let transformedData;
    
    if (data.metadata && data.clients) {
      // Backend export format
      transformedData = {
        clients: data.clients || [],
        cessions: extractCessionsFromClients(data.clients || []),
        exportTimestamp: data.metadata.exportTimestamp || data.metadata.exportTime || new Date().toISOString(),
        recordCount: data.metadata.recordCount || {},
        fileName: latestFile.name
      };
    } else {
      // Legacy format or direct format
      transformedData = {
        ...data,
        fileName: latestFile.name
      };
    }

    console.log('   ✓ Data transformation completed');
    console.log(`   👥 Transformed clients: ${transformedData.clients ? transformedData.clients.length : 0}`);
    console.log(`   📋 Extracted cessions: ${transformedData.cessions ? transformedData.cessions.length : 0}`);

    // Step 6: Validate data
    console.log('\n✅ Step 6: Data validation...');
    if (!transformedData.clients || !Array.isArray(transformedData.clients)) {
      console.log('   ❌ Clients data is not a valid array!');
    } else if (transformedData.clients.length === 0) {
      console.log('   ⚠️  Clients array is empty!');
    } else {
      console.log('   ✓ Clients data is valid');
    }

    console.log('\n🎉 Data loading test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Files in bucket: ${files.length}`);
    console.log(`   Export files: ${exportFiles.length}`);
    console.log(`   Latest file: ${latestFile.name}`);
    console.log(`   Clients loaded: ${transformedData.clients ? transformedData.clients.length : 0}`);
    console.log(`   Cessions extracted: ${transformedData.cessions ? transformedData.cessions.length : 0}`);

  } catch (error) {
    console.error('❌ Error during data loading test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

function extractCessionsFromClients(clients) {
  const allCessions = [];
  clients.forEach(client => {
    if (client.cessions && Array.isArray(client.cessions)) {
      client.cessions.forEach(cession => {
        allCessions.push({
          ...cession,
          clientId: client.id,
          clientName: client.fullName
        });
      });
    }
  });
  return allCessions;
}

// Run the test
testDataLoading();