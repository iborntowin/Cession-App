const axios = require('axios');

const BASE_URL = 'http://localhost:8082';

async function testDefaultUserLogin() {
    console.log('🔐 Testing Default User Login...\n');

    try {
        // Test login with default user
        console.log('📝 Attempting login with default user credentials...');
        const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/signin`, {
            email: 'Mousser@gmail.com',
            password: '123456'
        });

        console.log('✅ Login successful!');
        console.log('📋 Login Response:');
        console.log(`   Token: ${loginResponse.data.token.substring(0, 50)}...`);
        console.log(`   Email: ${loginResponse.data.email}`);
        console.log(`   Full Name: ${loginResponse.data.fullName}`);
        console.log(`   Role: ${loginResponse.data.role}`);
        console.log(`   User ID: ${loginResponse.data.id}`);

        // Test authenticated request
        console.log('\n🔒 Testing authenticated request...');
        const authHeader = { Authorization: `Bearer ${loginResponse.data.token}` };
        
        const usersResponse = await axios.get(`${BASE_URL}/api/v1/auth/users`, {
            headers: authHeader
        });

        console.log('✅ Authenticated request successful!');
        console.log(`📊 Found ${usersResponse.data.length} user(s) in the system:`);
        usersResponse.data.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.email} (${user.fullName}) - Role: ${user.role}`);
        });

        // Test wrong password
        console.log('\n❌ Testing login with wrong password...');
        try {
            await axios.post(`${BASE_URL}/api/v1/auth/signin`, {
                email: 'Mousser@gmail.com',
                password: 'wrongpassword'
            });
            console.log('❌ ERROR: Login should have failed with wrong password!');
        } catch (error) {
            console.log('✅ Login correctly failed with wrong password');
            console.log(`   Status: ${error.response?.status}`);
            console.log(`   Message: ${error.response?.data}`);
        }

        console.log('\n🎉 All tests passed! Default user integration is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        console.error('   Status:', error.response?.status);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Make sure the backend server is running on port 8082');
            console.error('   Run: mvn spring-boot:run');
        }
    }
}

// Run the test
testDefaultUserLogin();