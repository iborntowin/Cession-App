// Simple test script to check Supabase bucket contents and test file access
const supabaseUrl = 'https://ahqtluebfvzvddyjlbqf.supabase.co';
const bucketName = 'mobile-exports';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocXRsdWViZnZ6dmRkeWpsYnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk0MzEyNywiZXhwIjoyMDY0NTE5MTI3fQ.UK47VG5WVDSO4ifXYAHG2eb0rDVD89Hro0lVJsG4auk';

async function testSupabaseBucket() {
  try {
    console.log('Testing Supabase bucket access...');
    
    // Test 1: List files in bucket
    const listUrl = `${supabaseUrl}/storage/v1/object/list/${bucketName}`;
    console.log(`Listing files at: ${listUrl}`);
    
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
    
    console.log(`List response status: ${listResponse.status}`);
    
    if (listResponse.ok) {
      const files = await listResponse.json();
      console.log(`Found ${files.length} files in bucket:`);
      files.forEach(file => {
        console.log(`  - ${file.name} (${file.created_at})`);
      });
      
      // Test 2: Try to access a specific file if any exist
      if (files.length > 0) {
        const firstFile = files[0];
        const fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${firstFile.name}`;
        console.log(`\nTesting access to first file: ${fileUrl}`);
        
        const fileResponse = await fetch(fileUrl, {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        });
        
        console.log(`File access status: ${fileResponse.status}`);
        if (fileResponse.ok) {
          console.log('File is accessible!');
          
          // Test 2b: Try to fetch the actual content
          const contentResponse = await fetch(fileUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey
            }
          });
          
          if (contentResponse.ok) {
            const content = await contentResponse.text();
            console.log(`File content preview (first 200 chars): ${content.substring(0, 200)}...`);
            
            // Try to parse as JSON
            try {
              const jsonData = JSON.parse(content);
              console.log(`JSON structure: clients=${jsonData.clients?.length || 0}, metadata=${!!jsonData.metadata}`);
            } catch (parseError) {
              console.log('Content is not valid JSON');
            }
          } else {
            console.log(`Failed to fetch content: ${contentResponse.status}`);
          }
        } else {
          console.log('File access failed');
        }
      }
    } else {
      const errorText = await listResponse.text();
      console.log(`List error response:`, errorText);
    }
    
    // Test 3: Try some known file patterns
    console.log('\nTesting known file patterns...');
    const testFiles = [
      'mobile-export_latest.json',
      'export.json',
      'mobile-export.json'
    ];
    
    for (const fileName of testFiles) {
      const testUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
      try {
        const testResponse = await fetch(testUrl, {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          }
        });
        
        console.log(`${fileName}: ${testResponse.status}`);
      } catch (error) {
        console.log(`${fileName}: ERROR - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSupabaseBucket();