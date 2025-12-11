// Test scénario: Pointage sans shift prévu
const http = require('http');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const employeId = 110;
const secret = process.env.JWT_SECRET;

// Générer un token pour l'employé
const token = jwt.sign({ userId: employeId, role: 'employee' }, secret, { expiresIn: '1h' });

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

async function testPointageSansShift() {
  console.log('🧪 TEST: POINTAGE SANS SHIFT PRÉVU');
  console.log('═'.repeat(50));
  console.log('Employé ID:', employeId);
  console.log('Heure actuelle:', new Date().toLocaleTimeString('fr-FR'));
  console.log('');

  // 1. Vérifier l'état initial (pas d'anomalies)
  console.log('1️⃣ ÉTAT INITIAL - Vérification anomalies...');
  const initialAnomalies = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/anomalies?dateDebut=2025-12-05&dateFin=2025-12-05',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('   Anomalies avant:', initialAnomalies.data.anomalies?.length || 0);

  // 2. Effectuer un pointage d'ARRIVÉE
  console.log('\n2️⃣ POINTAGE ARRIVÉE (sans shift prévu)...');
  const pointageArrivee = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/pointage/auto',
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({ type: 'arrivee' }));
  
  console.log('   Status:', pointageArrivee.status);
  console.log('   Réponse:', pointageArrivee.data.message || pointageArrivee.data.error);
  if (pointageArrivee.data.pointage) {
    console.log('   Pointage créé ID:', pointageArrivee.data.pointage.id);
    console.log('   Type:', pointageArrivee.data.pointage.type);
    console.log('   Heure:', new Date(pointageArrivee.data.pointage.horodatage).toLocaleTimeString('fr-FR'));
  }

  // 3. Attendre 2 secondes puis vérifier les anomalies
  console.log('\n3️⃣ VÉRIFICATION DES ANOMALIES (après pointage)...');
  await new Promise(r => setTimeout(r, 2000));
  
  const afterAnomalies = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/anomalies?dateDebut=2025-12-05&dateFin=2025-12-05',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('   Anomalies après:', afterAnomalies.data.anomalies?.length || 0);
  
  if (afterAnomalies.data.anomalies?.length > 0) {
    console.log('   Détails:');
    afterAnomalies.data.anomalies.forEach(a => {
      console.log(`   - [${a.id}] ${a.type}: ${a.description?.substring(0, 50)}...`);
    });
  }

  // 4. Effectuer un pointage de DÉPART
  console.log('\n4️⃣ POINTAGE DÉPART (toujours sans shift prévu)...');
  const pointageDepart = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/pointage/auto',
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({ type: 'depart' }));
  
  console.log('   Status:', pointageDepart.status);
  console.log('   Réponse:', pointageDepart.data.message || pointageDepart.data.error);

  // 5. Vérification finale
  console.log('\n5️⃣ ÉTAT FINAL...');
  await new Promise(r => setTimeout(r, 1000));
  
  const finalAnomalies = await httpRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/anomalies?dateDebut=2025-12-05&dateFin=2025-12-05',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log('   Anomalies finales:', finalAnomalies.data.anomalies?.length || 0);
  if (finalAnomalies.data.anomalies?.length > 0) {
    finalAnomalies.data.anomalies.forEach(a => {
      console.log(`   - [${a.id}] ${a.type} (${a.gravite})`);
    });
  }

  // Résumé
  console.log('\n' + '═'.repeat(50));
  console.log('📊 RÉSUMÉ DU TEST:');
  console.log('   - Pointage ARRIVÉE:', pointageArrivee.status === 201 ? '✅ OK' : '❌ Échec');
  console.log('   - Pointage DÉPART:', pointageDepart.status === 201 ? '✅ OK' : '❌ Échec');
  console.log('   - Anomalies créées:', (finalAnomalies.data.anomalies?.length || 0) - (initialAnomalies.data.anomalies?.length || 0));
  
  if (finalAnomalies.data.anomalies?.length === 0) {
    console.log('\n💡 COMPORTEMENT: Pointage sans shift = PAS D\'ANOMALIE');
    console.log('   (C\'est normal - pas de référence pour comparer)');
  }
}

testPointageSansShift().catch(console.error);
