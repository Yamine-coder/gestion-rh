// test-analytics-minimal.js - Test minimal pour débugger
const http = require('http');

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testMinimal() {
  console.log('🧪 Test minimal analytics\n');

  // 1. Health check
  console.log('1️⃣ Health check...');
  const health = await makeRequest('/health');
  console.log(health.status === 200 ? '✅ OK' : '❌ Fail');

  // 2. Login
  console.log('\n2️⃣ Login...');
  const login = await makeRequest('/auth/login', 'POST', {
    email: 'thomas.laurent@restaurant.com',
    password: 'password123'
  });
  
  if (login.status !== 200) {
    console.error('❌ Login failed:', login.status);
    console.error('Response:', login.data);
    return;
  }
  
  console.log('✅ Connected');
  console.log('Token:', login.data.token ? 'Present' : 'Missing');
  console.log('User ID:', login.data.userId || login.data.user?.id || login.data.user?.userId || 'undefined');
  console.log('Full response keys:', Object.keys(login.data));

  const token = login.data.token;
  const userId = login.data.userId || login.data.user?.id || login.data.user?.userId;

  // 3. Test anomalies list
  console.log('\n3️⃣ Test /api/anomalies...');
  const anomalies = await makeRequest('/api/anomalies?limit=5', 'GET', null, token);
  console.log(anomalies.status === 200 ? '✅ OK' : `❌ ${anomalies.status}`);
  if (anomalies.status === 200) {
    console.log('Anomalies:', anomalies.data.anomalies?.length || 0);
  } else {
    console.log('Error:', anomalies.data);
  }

  // 4. Test analytics
  console.log('\n4️⃣ Test /api/anomalies/analytics...');
  const analytics = await makeRequest('/api/anomalies/analytics?periode=mois', 'GET', null, token);
  console.log(analytics.status === 200 ? '✅ OK' : `❌ ${analytics.status}`);
  if (analytics.status !== 200) {
    console.log('Error:', analytics.data);
  } else {
    console.log('KPIs:', Object.keys(analytics.data.kpis || {}));
  }

  // 5. Test score
  if (userId) {
    console.log(`\n5️⃣ Test /api/anomalies/score/${userId}...`);
    const score = await makeRequest(`/api/anomalies/score/${userId}`, 'GET', null, token);
    console.log(score.status === 200 ? '✅ OK' : `❌ ${score.status}`);
    if (score.status !== 200) {
      console.log('Error:', score.data);
    } else {
      console.log('Score:', score.data.score);
    }
  } else {
    console.log('\n⚠️ Skip score test (no userId)');
  }

  console.log('\n✅ Tests terminés');
}

testMinimal().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
