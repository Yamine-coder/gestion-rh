async function testAPI() {
  const fetch = (await import('node-fetch')).default;
  
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
  
  console.log('Token obtenu pour Jordan (ID:', loginData.user?.id || 'N/A', ')');
  
  // Tester l'API anomalies pour le 5 décembre
  const anomRes = await fetch('http://localhost:5000/api/anomalies?dateDebut=2025-12-05&dateFin=2025-12-05', {
    headers: { 'Authorization': 'Bearer ' + loginData.token }
  });
  const anomData = await anomRes.json();
  
  console.log('');
  console.log('Anomalies retournées:');
  if (anomData.anomalies && anomData.anomalies.length > 0) {
    anomData.anomalies.forEach(a => {
      console.log('  -', a.type, '| gravite:', a.gravite, '| statut:', a.statut);
    });
    console.log('Total:', anomData.anomalies.length);
  } else {
    console.log('Aucune anomalie trouvée');
    console.log('Réponse:', JSON.stringify(anomData, null, 2));
  }
}

testAPI();
