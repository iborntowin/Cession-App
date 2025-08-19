// Sample data creation script for testing the payments carousel
// This script will create sample clients, cessions, and payments

const API_BASE = 'http://localhost:8082/api/v1';

// You'll need to get a valid JWT token first by logging in
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${JWT_TOKEN}`
};

async function createSampleData() {
  try {
    console.log('Creating sample data...');

    // 1. Create sample clients
    const clients = [
      {
        fullName: 'Ahmed Ben Ali',
        cin: '12345678',
        workerNumber: '1234567890'
      },
      {
        fullName: 'Fatma Trabelsi',
        cin: '87654321',
        workerNumber: '0987654321'
      },
      {
        fullName: 'Mohamed Gharbi',
        cin: '11223344',
        workerNumber: '1122334455'
      }
    ];

    const createdClients = [];
    for (const client of clients) {
      const response = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers,
        body: JSON.stringify(client)
      });
      const result = await response.json();
      createdClients.push(result);
      console.log('Created client:', result.fullName);
    }

    // 2. Create sample cessions for different months
    const cessions = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const clientIndex = i % createdClients.length;
      
      const cession = {
        clientId: createdClients[clientIndex].id,
        totalLoanAmount: 5000 + (i * 1000), // Varying amounts
        monthlyPayment: 500 + (i * 50), // Varying monthly payments
        startDate: monthDate.toISOString().split('T')[0],
        bankOrAgency: `Bank ${i + 1}`,
        status: 'ACTIVE'
      };

      const response = await fetch(`${API_BASE}/cessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cession)
      });
      const result = await response.json();
      cessions.push(result);
      console.log('Created cession for month:', monthDate.toISOString().slice(0, 7));
    }

    // 3. Create sample payments for the last 6 months
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 15); // Mid-month
      const cession = cessions[i];
      
      // Create 1-3 payments per month
      const paymentsCount = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < paymentsCount; j++) {
        const paymentDate = new Date(monthDate);
        paymentDate.setDate(paymentDate.getDate() + (j * 7)); // Weekly payments
        
        const payment = {
          cessionId: cession.id,
          amount: Math.floor(Math.random() * 300) + 200, // Random amounts between 200-500
          paymentDate: paymentDate.toISOString().split('T')[0],
          notes: `Payment ${j + 1} for ${monthDate.toISOString().slice(0, 7)}`
        };

        const response = await fetch(`${API_BASE}/payments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payment)
        });
        const result = await response.json();
        console.log('Created payment:', result.amount, 'for', paymentDate.toISOString().slice(0, 7));
      }
    }

    console.log('Sample data creation completed!');
    console.log('You can now refresh the payments page to see the carousel with data.');

  } catch (error) {
    console.error('Error creating sample data:', error);
  }
}

// Instructions for use:
console.log(`
To use this script:
1. Start your backend server (should be running on port 8082)
2. Login to your app and get a JWT token from the browser's developer tools
3. Replace 'YOUR_JWT_TOKEN_HERE' with your actual token
4. Run: node create-sample-data.js
`);

// Uncomment the line below to run the script
// createSampleData();