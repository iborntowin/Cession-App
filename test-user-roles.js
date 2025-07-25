const axios = require('axios');

const BASE_URL = 'http://localhost:8082';

async function testUserRoles() {
    console.log('🔐 Testing User Role Assignment...\n');

    try {
        // Test 1: Sign up a new regular user
        console.log('📝 Testing regular user signup...');
        const signupResponse = await axios.post(`${BASE_URL}/api/v1/auth/signup`, {
            email: 'testuser@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User'
        });

        console.log('✅ Signup successful!');
        console.log('📋 Signup Response:');
        console.log(`   Email: ${signupResponse.data.email}`);
        console.log(`   Full Name: ${signupResponse.data.fullName}`);
        console.log(`   Role: ${signupResponse.data.role}`);
        console.log(`   User ID: ${signupResponse.data.id}`);

        // Verify the role is USER (not ADMIN)
        if (signupResponse.data.role === 'USER') {
            console.log('✅ Correct role assigned: USER');
        } else {
            console.log(`❌ Wrong role assigned: ${signupResponse.data.role} (expected USER)`);
        }

        // Test 2: Login with the new user
        console.log('\n🔑 Testing login with new user...');
        const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/signin`, {
            email: 'testuser@example.com',
            password: 'password123'
        });

        console.log('✅ Login successful!');
        console.log(`   Role confirmed: ${loginResponse.data.role}`);

        // Test 3: Try to access admin-only endpoint (should fail)
        console.log('\n🚫 Testing access to admin-only endpoint...');
        const authHeader = { Authorization: `Bearer ${loginResponse.data.token}` };
        
        try {
            await axios.get(`${BASE_URL}/api/v1/auth/users`, {
                headers: authHeader
            });
            console.log('❌ ERROR: USER should not have access to admin endpoint!');
        } catch (error) {
            if (error.response?.status === 403) {
                console.log('✅ Correctly denied access to admin endpoint (403 Forbidden)');
            } else {
                console.log(`⚠️  Unexpected error: ${error.response?.status} - ${error.response?.data}`);
            }
        }

        // Test 4: Try to access regular endpoint (should succeed)
        console.log('\n✅ Testing access to regular endpoint...');
        try {
            const clientsResponse = await axios.get(`${BASE_URL}/api/v1/clients`, {
                headers: authHeader
            });
            console.log('✅ Successfully accessed regular endpoint');
            console.log(`   Found ${clientsResponse.data.length} clients`);
        } catch (error) {
            console.log(`❌ Failed to access regular endpoint: ${error.response?.status} - ${error.response?.data}`);
        }

        // Test 5: Login with default admin user
        console.log('\n👑 Testing login with default admin user...');
        const adminLoginResponse = await axios.post(`${BASE_URL}/api/v1/auth/signin`, {
            email: 'Mousser@gmail.com',
            password: '123456'
        });

        console.log('✅ Admin login successful!');
        console.log(`   Role confirmed: ${adminLoginResponse.data.role}`);

        // Test 6: Admin access to admin endpoint (should succeed)
        console.log('\n🔑 Testing admin access to admin endpoint...');
        const adminAuthHeader = { Authorization: `Bearer ${adminLoginResponse.data.token}` };
        
        try {
            const usersResponse = await axios.get(`${BASE_URL}/api/v1/auth/users`, {
                headers: adminAuthHeader
            });
            console.log('✅ Admin successfully accessed admin endpoint');
            console.log(`   Found ${usersResponse.data.length} users in system:`);
            usersResponse.data.forEach((user, index) => {
                console.log(`     ${index + 1}. ${user.email} (${user.fullName}) - Role: ${user.role}`);
            });
        } catch (error) {
            console.log(`❌ Admin failed to access admin endpoint: ${error.response?.status} - ${error.response?.data}`);
        }

        console.log('\n🎉 All role assignment tests completed!');

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
testUserRoles();