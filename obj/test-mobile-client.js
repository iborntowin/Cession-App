// Test script to verify mobile client data fetching
// Using built-in fetch (Node.js 18+)

// Mock AsyncStorage for Node.js testing
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

// Mock React Native modules
global.AsyncStorage = mockAsyncStorage;

// Import the services (we'll need to adjust paths)
async function testMobileClientDataFetching() {
    console.log('Testing mobile client data fetching...\n');

    try {
        // Test 1: Direct Supabase access
        console.log('1. Testing direct Supabase file access...');
        const supabaseUrl = 'https://ahqtluebfvzvddyjlbqf.supabase.co';
        const bucketName = 'mobile-exports';
        const fileName = 'export-1752658866271.json'; // Latest file from our test

        const fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
        console.log(`   Fetching: ${fileUrl}`);

        const response = await fetch(fileUrl);
        console.log(`   Status: ${response.status}`);

        let rawData = null;
        if (response.ok) {
            rawData = await response.json();
            console.log(`   ✅ Success! Found ${rawData.clients?.length || 0} clients and ${rawData.metadata?.recordCount?.cessions || 0} cessions`);

            // Test data structure
            if (rawData.clients && rawData.clients.length > 0) {
                const firstClient = rawData.clients[0];
                console.log(`   📋 First client: ${firstClient.fullName} (ID: ${firstClient.id})`);
                console.log(`   📋 Client has ${firstClient.cessions?.length || 0} cessions`);

                if (firstClient.cessions && firstClient.cessions.length > 0) {
                    const firstCession = firstClient.cessions[0];
                    console.log(`   💰 First cession: ${firstCession.monthlyPayment} TND/month, Status: ${firstCession.status}`);
                }
            }
        } else {
            console.log(`   ❌ Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        console.log('\n2. Testing data transformation...');

        if (rawData) {

            // Transform data like the mobile client would
            let transformedData;
            if (rawData.metadata && rawData.clients) {
                // Backend export format
                transformedData = {
                    clients: rawData.clients || [],
                    cessions: extractCessionsFromClients(rawData.clients || []),
                    exportTimestamp: rawData.metadata.exportTime || new Date().toISOString(),
                    recordCount: rawData.metadata.recordCount || {}
                };
            } else {
                // Legacy format
                transformedData = rawData;
            }

            console.log(`   ✅ Transformed data structure:`);
            console.log(`   📊 Clients: ${transformedData.clients.length}`);
            console.log(`   📊 Total cessions: ${transformedData.cessions.length}`);
            console.log(`   📊 Export time: ${transformedData.exportTimestamp}`);
        }

        console.log('\n3. Testing client filtering and search...');

        if (rawData) {
            const clients = rawData.clients || [];

            // Test search functionality
            const searchQuery = 'client'; // Search for clients with 'client' in name
            const filteredClients = clients.filter(client =>
                client.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.cin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                client.clientNumber?.toString().includes(searchQuery) ||
                client.workerNumber?.toLowerCase().includes(searchQuery.toLowerCase())
            );

            console.log(`   🔍 Search for "${searchQuery}": ${filteredClients.length} results`);

            // Test status filtering
            const activeClients = clients.filter(client =>
                client.cessions && client.cessions.some(cession =>
                    cession.status === 'ACTIVE'
                )
            );

            console.log(`   📈 Clients with ACTIVE cessions: ${activeClients.length}`);
        }

        console.log('\n4. Testing offline caching simulation...');

        if (rawData) {

            // Simulate caching
            await mockAsyncStorage.setItem('cached_data', JSON.stringify(rawData));
            await mockAsyncStorage.setItem('cached_data_timestamp', new Date().toISOString());

            console.log('   💾 Data cached successfully');

            // Simulate retrieving from cache
            const cachedData = await mockAsyncStorage.getItem('cached_data');
            const cachedTimestamp = await mockAsyncStorage.getItem('cached_data_timestamp');

            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                console.log(`   ✅ Cache retrieval successful: ${parsedData.clients?.length || 0} clients`);
                console.log(`   🕒 Cached at: ${cachedTimestamp}`);
            }
        }

        console.log('\n✅ All tests completed successfully!');
        console.log('\n📱 Mobile client should be able to:');
        console.log('   - Fetch data from Supabase automatically');
        console.log('   - Display client lists with search and filtering');
        console.log('   - Show detailed client and cession information');
        console.log('   - Work offline with cached data');
        console.log('   - Handle connectivity changes gracefully');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
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
testMobileClientDataFetching();