// Test rapide de l'API anomalies pour Marco
const http = require('http');

function makeRequest(path, method, body, token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('🔍 TEST API ANOMALIES POUR MARCO\n');

  // 1. Login
  console.log('1️⃣ Connexion...');
  const login = await makeRequest('/auth/login', 'POST', {
    email: 'marco.romano@restaurant.com',
    password: 'Marco123!'
  });

  if (login.status !== 200) {
    console.log('❌ Échec login:', login);
    return;
  }
  console.log('✅ Connecté! Role:', login.data.role);
  const token = login.data.token;

  // 2. Anomalies aujourd'hui
  console.log('\n2️⃣ Anomalies aujourd\'hui...');
  const today = '2025-12-04';
  const anomalies = await makeRequest(
    `/api/anomalies?dateDebut=${today}&dateFin=${today}`,
    'GET', null, token
  );

  console.log('Status:', anomalies.status);
  if (anomalies.data?.success) {
    console.log('✅ Anomalies trouvées:', anomalies.data.anomalies?.length || 0);
    anomalies.data.anomalies?.forEach(a => {
      console.log(`   - ${a.type} (${a.gravite}) - ${a.statut}`);
    });
  } else {
    console.log('❌ Erreur:', anomalies.data?.error || anomalies.raw);
  }

  // 3. Historique 30 jours
  console.log('\n3️⃣ Historique 30 jours...');
  const historique = await makeRequest(
    `/api/anomalies?dateDebut=2025-11-04&dateFin=2025-12-04&limit=50`,
    'GET', null, token
  );

  if (historique.data?.success) {
    console.log('✅ Total anomalies:', historique.data.anomalies?.length || 0);
  } else {
    console.log('❌ Erreur:', historique.data?.error);
  }
}

test();
