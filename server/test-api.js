const fetch = require('node-fetch');

async function testAPI() {
  // Obtenir un token pour Jordan
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jordan.morina@example.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  
  if (!loginData.token) {
    console.log('Erreur login:', loginData);
    return;
  }
  
  console.log('Token obtenu pour Jordan');
  
  // Tester l'API anomalies pour le 5 décembre
  const anomRes = await fetch('http://localhost:5000/api/anomalies?dateDebut=2025-12-05&dateFin=2025-12-05', {
    headers: { 'Authorization': 'Bearer ' + loginData.token }
  });
  const anomData = await anomRes.json();
  
  console.log('');
  console.log('Anomalies retournées:');
  if (anomData.anomalies) {
    anomData.anomalies.forEach(a => {
      console.log('  -', a.type, '| gravite:', a.gravite, '| statut:', a.statut);
    });
    console.log('Total:', anomData.anomalies.length);
  } else {
    console.log('Pas d anomalies ou erreur:', anomData);
  }
}

testAPI();
