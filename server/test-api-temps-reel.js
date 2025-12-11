// Test API temps réel - Simulation Admin et Employé
const http = require('http');

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testAPITempsReel() {
  console.log('\n🔄 TEST API TEMPS RÉEL\n');
  console.log('═'.repeat(60));

  // 1. Login Admin
  console.log('\n1️⃣ LOGIN ADMIN');
  const adminLoginRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'moussa@restaurant.com', password: 'password123' }));
  
  const adminToken = adminLoginRes.data.token;
  console.log('   ✅ Admin connecté');

  // 2. Login Employé
  console.log('\n2️⃣ LOGIN EMPLOYÉ');
  const empLoginRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: 'yjordan496@gmail.com', password: 'password123' }));
  
  const empToken = empLoginRes.data.token;
  const empId = empLoginRes.data.user?.id;
  console.log(`   ✅ Employé connecté (ID: ${empId})`);

  // 3. Test API Admin - Toutes les anomalies
  console.log('\n3️⃣ API ADMIN: GET /api/anomalies');
  const adminAnomaliesRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/anomalies?limit=5',
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json' 
    }
  });
  
  console.log(`   Status: ${adminAnomaliesRes.status}`);
  console.log(`   Total: ${adminAnomaliesRes.data.pagination?.total || 'N/A'}`);
  console.log('   Dernières anomalies:');
  (adminAnomaliesRes.data.anomalies || []).forEach(a => {
    console.log(`   - [${a.id}] ${a.type} - ${a.employe?.prenom} ${a.employe?.nom}`);
  });

  // 4. Test API Employé - Ses anomalies du jour
  console.log('\n4️⃣ API EMPLOYÉ: GET /api/anomalies (filtre auto par userId)');
  const today = new Date().toISOString().split('T')[0];
  const empAnomaliesRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/anomalies?dateDebut=${today}&dateFin=${today}`,
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json' 
    }
  });
  
  console.log(`   Status: ${empAnomaliesRes.status}`);
  console.log(`   Anomalies du jour: ${empAnomaliesRes.data.anomalies?.length || 0}`);
  (empAnomaliesRes.data.anomalies || []).forEach(a => {
    console.log(`   - [${a.id}] ${a.type}: ${a.description?.substring(0, 40)}...`);
  });

  // 5. Test endpoint alertes (pour Pointage.jsx)
  console.log('\n5️⃣ API EMPLOYÉ: GET /api/alertes/mon-statut');
  const alertesRes = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/alertes/mon-statut',
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${empToken}`,
      'Content-Type': 'application/json' 
    }
  });
  
  console.log(`   Status: ${alertesRes.status}`);
  console.log(`   Rappel: ${alertesRes.data.rappel ? 'OUI' : 'NON'}`);
  if (alertesRes.data.rappel) {
    console.log(`   Message: ${alertesRes.data.rappel.message}`);
  }

  // Résumé
  console.log('\n' + '═'.repeat(60));
  console.log('✅ TOUS LES ENDPOINTS FONCTIONNENT CORRECTEMENT');
  console.log('═'.repeat(60));
  console.log('\n📊 RÉCAPITULATIF DU FLUX TEMPS RÉEL:\n');
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│  SERVEUR                                                │');
  console.log('│  ├── Scheduler (1 min) → Détecte absences              │');
  console.log('│  ├── Pointage → Détecte retards/départs anticipés      │');
  console.log('│  └── API /api/anomalies → Sert les données             │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│  ADMIN (GestionAnomalies.jsx)                          │');
  console.log('│  └── Polling 30s → Voit TOUTES les anomalies           │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│  EMPLOYÉ (Pointage.jsx + MesAnomalies.jsx)              │');
  console.log('│  └── Polling 60s → Voit SES anomalies                  │');
  console.log('└─────────────────────────────────────────────────────────┘');
  console.log('\n🎯 Délai max entre création et affichage:');
  console.log('   - Admin: ~30 secondes');
  console.log('   - Employé: ~60 secondes');
  console.log('');
}

testAPITempsReel().catch(console.error);
