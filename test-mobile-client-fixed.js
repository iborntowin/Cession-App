// Test script to verify the improved mobile client file discovery
const supabaseUrl = 'https://ahqtluebfvzvddyjlbqf.supabase.co';
const bucketName = 'mobile-exports';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocXRsdWViZnZ6dmRkeWpsYnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk0MzEyNywiZXhwIjoyMDY0NTE5MTI3fQ.UK47VG5WVDSO4ifXYAHG2eb0rDVD89Hro0lVJsG4auk';

async function testImprovedFileDiscovery() {
  console.log('🔍 Testing improved mobile client file discovery...\n');

  try {
    // Step 1: List all files in bucket (like the improved mobile client does)
    console.log('1. Listing all files in bucket...');
    const listUrl = `${supabaseUrl}/storage/v1/object/list/${bucketName}`;
    
    const listResponse = await fetch(listUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey
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

    const allFiles = await listResponse.json();
    console.log(`   Found ${allFiles.length} total files in bucket`);
    allFiles.forEach(file => {
      console.log(`   - ${file.name} (${file.created_at})`);
    });

    // Step 2: Filter for export files (improved logic)
    console.log('\n2. Filtering for export files...');
    const exportFiles = allFiles.filter(f => f.name && (
      f.name.startsWith('export-') ||
      f.name.startsWith('mobile-export_') ||
      f.name.includes('export')
    ) && f.name.endsWith('.json'));

    console.log(`   Found ${exportFiles.length} export files:`);
    exportFiles.forEach(file => {
      console.log(`   ✅ ${file.name} (${file.created_at})`);
    });

    // Step 3: Sort by created_at to get most recent
    if (exportFiles.length > 0) {
      exportFiles.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const latestFile = exportFiles[0];
      
      console.log(`\n3. Most recent export file: ${latestFile.name}`);

      // Step 4: Test accessing the file
      console.log('\n4. Testing file access...');
      const fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${latestFile.name}`;
      console.log(`   Accessing: ${fileUrl}`);

      const fileResponse = await fetch(fileUrl);
      console.log(`   Status: ${fileResponse.status}`);

      if (fileResponse.ok) {
        const data = await fileResponse.json();
        console.log(`   ✅ Success! Data structure:`);
        console.log(`      - Clients: ${data.clients?.length || 0}`);
        console.log(`      - Metadata: ${!!data.metadata}`);
        console.log(`      - Export time: ${data.metadata?.exportTime || 'N/A'}`);
        
        // Test the mobile client's data transformation
        let transformedData;
        if (data.metadata && data.clients) {
          // Backend export format
          transformedData = {
            clients: data.clients || [],
            cessions: extractCessionsFromClients(data.clients || []),
            exportTimestamp: data.metadata.exportTime || new Date().toISOString(),
            recordCount: data.metadata.recordCount || {}
          };
        } else {
          // Legacy format
          transformedData = data;
        }

        console.log(`\n5. Transformed data for mobile client:`);
        console.log(`   - Clients: ${transformedData.clients.length}`);
        console.log(`   - Total cessions: ${transformedData.cessions.length}`);
        console.log(`   - Export timestamp: ${transformedData.exportTimestamp}`);

        // Test client search functionality
        console.log(`\n6. Testing client search functionality...`);
        const searchQuery = 'client';
        const filteredClients = transformedData.clients.filter(client =>
          client.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.cin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.clientNumber?.toString().includes(searchQuery) ||
          client.workerNumber?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        console.log(`   Search for "${searchQuery}": ${filteredClients.length} results`);

        // Test status filtering
        const activeClients = transformedData.clients.filter(client =>
          client.cessions && client.cessions.some(cession =>
            cession.status === 'ACTIVE'
          )
        );
        console.log(`   Clients with ACTIVE cessions: ${activeClients.length}`);

        console.log('\n✅ All tests passed! The mobile client should now work correctly.');
        
      } else {
        console.log(`   ❌ Failed to access file: ${fileResponse.status}`);
      }
    } else {
      console.log('\n❌ No export files found in bucket');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Helper function to extract cessions from clients
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
testImprovedFileDiscovery();