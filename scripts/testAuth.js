// Use built-in fetch (Node.js 18+) or provide curl alternative
const fetch = globalThis.fetch || (() => {
  console.log('❌ This test requires Node.js 18+ with built-in fetch support.');
  console.log('💡 Alternatively, you can test the API manually using curl or a REST client.');
  process.exit(1);
});

const API_BASE = 'http://localhost:3001/api';

async function testAuthentication() {
  try {
    console.log('🧪 Testing Local Authentication API\n');

    // Test 1: Register a new user
    console.log('1️⃣ Testing user registration...');
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User'
      })
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ Registration successful');
      console.log(`   User ID: ${registerData.user.id}`);
      console.log(`   Email: ${registerData.user.email}`);
      console.log(`   Name: ${registerData.user.name}`);
      console.log(`   Token: ${registerData.token.substring(0, 20)}...\n`);

      const token = registerData.token;

      // Test 2: Login with the same user
      console.log('2️⃣ Testing user login...');
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        })
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        console.log(`   Token: ${loginData.token.substring(0, 20)}...\n`);

        // Test 3: Access protected route
        console.log('3️⃣ Testing protected route access...');
        const meResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (meResponse.ok) {
          const userData = await meResponse.json();
          console.log('✅ Protected route access successful');
          console.log(`   User: ${userData.name} (${userData.email})\n`);
        } else {
          console.log('❌ Protected route access failed');
          console.log(`   Status: ${meResponse.status}`);
          const errorData = await meResponse.text();
          console.log(`   Error: ${errorData}\n`);
        }

        // Test 4: Test invalid token
        console.log('4️⃣ Testing invalid token handling...');
        const invalidResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': 'Bearer invalid_token' }
        });

        if (!invalidResponse.ok) {
          console.log('✅ Invalid token properly rejected');
          console.log(`   Status: ${invalidResponse.status}\n`);
        }

      } else {
        console.log('❌ Login failed');
        const loginError = await loginResponse.text();
        console.log(`   Error: ${loginError}\n`);
      }

    } else {
      console.log('❌ Registration failed');
      const registerError = await registerResponse.text();
      console.log(`   Error: ${registerError}\n`);
    }

    console.log('🎉 Authentication API test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if server is available
async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  const isServerRunning = await checkServerHealth();
  
  if (!isServerRunning) {
    console.log('❌ Server is not running on http://localhost:3001');
    console.log('💡 Please start the server with: npm run dev');
    process.exit(1);
  }

  await testAuthentication();
}

if (require.main === module) {
  main();
}
