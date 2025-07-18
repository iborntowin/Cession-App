// Debug script to test file listing
const supabaseUrl = 'https://ahqtluebfvzvddyjlbqf.supabase.co';
const bucketName = 'mobile-exports';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocXRsdWViZnZ6dmRkeWpsYnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk0MzEyNywiZXhwIjoyMDY0NTE5MTI3fQ.UK47VG5WVDSO4ifXYAHG2eb0rDVD89Hro0lVJsG4auk';

async function debugListFiles() {
  console.log('🔍 Debug: Testing file listing...\n');

  try {
    const listUrl = `${supabaseUrl}/storage/v1/object/list/${bucketName}`;
    console.log(`URL: ${listUrl}`);
    
    const requestBody = JSON.stringify({
      limit: 100,
      prefix: '',
      sortBy: { column: 'created_at', order: 'desc' }
    });
    console.log(`Request body: ${requestBody}`);

    const headers = {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey
    };
    console.log(`Headers: ${JSON.stringify(headers, null, 2)}`);

    console.log('\nMaking request...');
    const listResponse = await fetch(listUrl, {
      method: 'POST',
      headers: headers,
      body: requestBody
    });

    console.log(`Response status: ${listResponse.status}`);
    console.log(`Response headers: ${JSON.stringify([...listResponse.headers.entries()], null, 2)}`);

    if (listResponse.ok) {
      const files = await listResponse.json();
      console.log(`\n✅ Success! Found ${files.length} files:`);
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${file.created_at})`);
      });

      // Test the filtering logic
      const exportFiles = files.filter(f => f.name && (
        f.name.startsWith('export-') ||
        f.name.startsWith('mobile-export_') ||
        f.name.includes('export')
      ) && f.name.endsWith('.json'));

      console.log(`\n📊 Export files found: ${exportFiles.length}`);
      exportFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${file.created_at})`);
      });

      if (exportFiles.length > 0) {
        exportFiles.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        console.log(`\n🎯 Latest file: ${exportFiles[0].name}`);
      }

    } else {
      const errorText = await listResponse.text();
      console.log(`❌ Error response: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugListFiles();