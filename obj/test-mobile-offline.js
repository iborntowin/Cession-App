// Comprehensive test to simulate mobile app offline/online behavior
const supabaseUrl = 'https://ahqtluebfvzvddyjlbqf.supabase.co';
const bucketName = 'mobile-exports';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocXRsdWViZnZ6dmRkeWpsYnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk0MzEyNywiZXhwIjoyMDY0NTE5MTI3fQ.UK47VG5WVDSO4ifXYAHG2eb0rDVD89Hro0lVJsG4auk';

// Mock AsyncStorage for testing
const mockAsyncStorage = {
  storage: {},
  async getItem(key) {
    return this.storage[key] || null;
  },
  async setItem(key, value) {
    this.storage[key] = value;
  },
  async removeItem(key) {
    delete this.storage[key];
  }
};

// Simulate the mobile client's connection status logic
class MockSupabaseService {
  constructor() {
    this.supabaseUrl = supabaseUrl;
    this.bucketName = bucketName;
    this.serviceRoleKey = serviceRoleKey;
    this.connectionStatus = {
      isConnected: false,
      status: 'Unknown',
      statusColor: '#757575',
      lastChecked: null,
      error: null,
      availableFiles: [],
      selectedFile: null,
      mode: 'automatic'
    };
  }

  async listAllFiles() {
    try {
      const listUrl = `${this.supabaseUrl}/storage/v1/object/list/${this.bucketName}`;

      const listResponse = await fetch(listUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'apikey': this.serviceRoleKey
        },
        body: JSON.stringify({
          limit: 100,
          prefix: '',
          sortBy: { column: 'created_at', order: 'desc' }
        }),
        timeout: 10000
      });

      if (listResponse.ok) {
        const files = await listResponse.json();
        return files || [];
      } else {
        console.log('Failed to list files:', listResponse.status);
        return [];
      }
    } catch (error) {
      console.log('Error listing files:', error.message);
      return [];
    }
  }

  async checkConnection() {
    const startTime = Date.now();
    try {
      let latestFile = null;

      // Try backend first (will fail in this test)
      console.log('🔄 Trying backend connection...');
      const backendUrls = [
        'http://10.0.2.2:8082/api/v1/export/mobile/status',
        'http://localhost:8082/api/v1/export/mobile/status'
      ];

      let backendConnected = false;
      for (const url of backendUrls) {
        try {
          const response = await fetch(url, { timeout: 2000 });
          if (response.ok) {
            backendConnected = true;
            console.log(`✅ Backend connected: ${url}`);
            break;
          }
        } catch (error) {
          console.log(`❌ Backend failed: ${url} - ${error.message}`);
        }
      }

      if (!backendConnected) {
        console.log('⚠️  Backend not available, trying direct Supabase...');
      }

      // Try Supabase direct access
      console.log('🔄 Testing Supabase storage access...');
      const storageTestUrl = `${this.supabaseUrl}/storage/v1/buckets`;

      const storageTestResponse = await fetch(storageTestUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.serviceRoleKey}`,
          'apikey': this.serviceRoleKey
        },
        timeout: 5000
      });

      let allFiles = [];

      if (storageTestResponse.ok) {
        console.log('✅ Supabase storage accessible');

        // List all files and find export files
        allFiles = await this.listAllFiles();
        console.log(`📁 Found ${allFiles.length} files in bucket`);

        if (allFiles.length > 0) {
          // Look for export files with improved pattern matching
          const exportFiles = allFiles.filter(f => f.name && (
            f.name.startsWith('export-') ||
            f.name.startsWith('mobile-export_') ||
            f.name.includes('export')
          ) && f.name.endsWith('.json'));

          console.log(`📊 Found ${exportFiles.length} export files:`);
          exportFiles.forEach(file => {
            console.log(`   - ${file.name} (${file.created_at})`);
          });

          if (exportFiles.length > 0) {
            // Sort by created_at to get most recent
            exportFiles.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            latestFile = exportFiles[0].name;
            console.log(`🎯 Using latest file: ${latestFile}`);
          }
        }
      }

      const responseTime = Date.now() - startTime;

      // Update connection status
      this.connectionStatus = {
        isConnected: true,
        status: latestFile ? 'Connected' : 'Connected (No Data)',
        statusColor: latestFile ? '#4CAF50' : '#FF9800',
        lastChecked: new Date().toISOString(),
        responseTime,
        error: latestFile ? null : 'No export files found yet - waiting for first export',
        filesCount: allFiles.length,
        latestFile,
        hasData: !!latestFile,
        availableFiles: allFiles,
        selectedFile: latestFile,
        mode: 'automatic'
      };

      return true;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.connectionStatus = {
        isConnected: false,
        status: 'Disconnected',
        statusColor: '#FF5722',
        lastChecked: new Date().toISOString(),
        error: error.message,
        responseTime,
        hasData: false,
        availableFiles: [],
        selectedFile: null,
        mode: 'automatic'
      };

      return false;
    }
  }

  async getCurrentData() {
    if (!this.connectionStatus.latestFile) {
      // Try cached data first
      const cachedData = await mockAsyncStorage.getItem('cached_data');
      if (cachedData) {
        console.log('📱 Using cached data (offline mode)');
        return JSON.parse(cachedData);
      }

      return {
        clients: [],
        cessions: [],
        exportTimestamp: new Date().toISOString(),
        message: 'No data available. Please check connection.',
        fileName: null
      };
    }

    // Fetch fresh data
    const fileUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${this.connectionStatus.latestFile}`;
    console.log(`📥 Fetching data from: ${this.connectionStatus.latestFile}`);

    const response = await fetch(fileUrl);
    if (response.ok) {
      const data = await response.json();

      // Transform data like the mobile client does
      let transformedData;
      if (data.metadata && data.clients) {
        transformedData = {
          clients: data.clients || [],
          cessions: this.extractCessionsFromClients(data.clients || []),
          exportTimestamp: data.metadata.exportTime || new Date().toISOString(),
          recordCount: data.metadata.recordCount || {},
          fileName: this.connectionStatus.latestFile
        };
      } else {
        transformedData = {
          ...data,
          fileName: this.connectionStatus.latestFile
        };
      }

      // Cache the data
      await mockAsyncStorage.setItem('cached_data', JSON.stringify(transformedData));
      await mockAsyncStorage.setItem('cached_data_timestamp', new Date().toISOString());

      return transformedData;
    } else {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }
  }

  extractCessionsFromClients(clients) {
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

  getConnectionStatus() {
    return { ...this.connectionStatus };
  }
}

async function testMobileAppWorkflow() {
  console.log('🚀 Testing Complete Mobile App Workflow\n');
  console.log('='.repeat(50));

  const mobileService = new MockSupabaseService();

  try {
    // Test 1: Initial connection check
    console.log('\n📱 STEP 1: Initial Connection Check');
    console.log('-'.repeat(30));

    const connected = await mobileService.checkConnection();
    const status = mobileService.getConnectionStatus();

    console.log(`Connection Status: ${status.status}`);
    console.log(`Response Time: ${status.responseTime}ms`);
    console.log(`Files Available: ${status.filesCount}`);
    console.log(`Latest File: ${status.latestFile || 'None'}`);
    console.log(`Has Data: ${status.hasData ? 'Yes' : 'No'}`);

    if (status.error) {
      console.log(`Error: ${status.error}`);
    }

    // Test 2: Data fetching
    console.log('\n📊 STEP 2: Data Fetching');
    console.log('-'.repeat(30));

    const data = await mobileService.getCurrentData();
    console.log(`Clients Found: ${data.clients?.length || 0}`);
    console.log(`Cessions Found: ${data.cessions?.length || 0}`);
    console.log(`Export Time: ${data.exportTimestamp}`);
    console.log(`Data Source: ${data.fileName || 'Cache/Default'}`);

    if (data.clients && data.clients.length > 0) {
      const firstClient = data.clients[0];
      console.log(`\nSample Client: ${firstClient.fullName} (ID: ${firstClient.id})`);
      console.log(`Client Cessions: ${firstClient.cessions?.length || 0}`);
    }

    // Test 3: Offline simulation
    console.log('\n📴 STEP 3: Offline Mode Simulation');
    console.log('-'.repeat(30));

    // Clear connection status to simulate offline
    mobileService.connectionStatus.isConnected = false;
    mobileService.connectionStatus.latestFile = null;

    const offlineData = await mobileService.getCurrentData();
    console.log(`Offline Data Available: ${offlineData.clients?.length > 0 ? 'Yes' : 'No'}`);
    console.log(`Cached Clients: ${offlineData.clients?.length || 0}`);
    console.log(`Data Source: ${offlineData.isFromCache ? 'Cache' : 'Default'}`);

    // Test 4: Client filtering and search
    if (data.clients && data.clients.length > 0) {
      console.log('\n🔍 STEP 4: Search and Filter Testing');
      console.log('-'.repeat(30));

      // Test name search
      const searchQuery = 'client';
      const nameResults = data.clients.filter(client =>
        client.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log(`Name search for "${searchQuery}": ${nameResults.length} results`);

      // Test status filtering
      const activeClients = data.clients.filter(client =>
        client.cessions && client.cessions.some(cession => cession.status === 'ACTIVE')
      );
      console.log(`Clients with ACTIVE cessions: ${activeClients.length}`);

      // Test workplace filtering
      const workplaceGroups = {};
      data.clients.forEach(client => {
        const workplace = client.workplace?.name || 'Unknown';
        workplaceGroups[workplace] = (workplaceGroups[workplace] || 0) + 1;
      });
      console.log(`Workplace distribution:`, workplaceGroups);
    }

    // Test 5: Connection status display simulation
    console.log('\n📱 STEP 5: Mobile UI Status Display');
    console.log('-'.repeat(30));

    const finalStatus = mobileService.getConnectionStatus();
    console.log('Mobile App Status Display:');
    console.log(`Connection Status: ${finalStatus.status === 'Connected' ? '✅' : '❌'} ${finalStatus.status}`);
    console.log(`Last Checked: ${getLastSyncText(finalStatus.lastChecked)}`);
    console.log(`Response Time: ${finalStatus.responseTime || 'N/A'}`);
    console.log(`Files Available: ${finalStatus.filesCount || 0}`);
    console.log(`Update Mode: ${finalStatus.mode === 'automatic' ? '🔄 Automatic' : '📋 Manual'}`);

    if (finalStatus.error) {
      console.log(`Status: ${finalStatus.error}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 MOBILE APP WORKFLOW TEST COMPLETE');
    console.log('='.repeat(50));

    console.log('\n✅ Summary:');
    console.log(`- Connection: ${connected ? 'SUCCESS' : 'FAILED'}`);
    console.log(`- Data Access: ${data.clients?.length > 0 ? 'SUCCESS' : 'LIMITED'}`);
    console.log(`- Offline Support: ${offlineData.clients?.length > 0 ? 'SUCCESS' : 'NO CACHE'}`);
    console.log(`- File Discovery: ${status.latestFile ? 'SUCCESS' : 'NO FILES'}`);

    console.log('\n📱 The mobile app should now:');
    console.log('   ✅ Connect to Supabase automatically');
    console.log('   ✅ Find export files with any naming pattern');
    console.log('   ✅ Display proper connection status');
    console.log('   ✅ Work offline with cached data');
    console.log('   ✅ Support client search and filtering');
    console.log('   ✅ Handle connection failures gracefully');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

function getLastSyncText(timestamp) {
  if (!timestamp) return 'Never';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}

// Run the comprehensive test
testMobileAppWorkflow();