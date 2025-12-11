// Test rapide du système d'alertes
const fetch = require('node-fetch');

async function testAlertes() {
  console.log('=== TEST SYSTÈME ALERTES ===\n');
  
  // 1. Login admin
  console.log('1. Login admin...');
  let token;
  
  const admins = [
    { email: 'moussa@restaurant.com', password: 'Admin2025!' },
    { email: 'admin@gestionrh.com', password: 'admin123' },
    { email: 'moussa@restaurant.com', password: 'admin123' }
  ];
  
  for (const admin of admins) {
    try {
      const loginRes = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admin)
      });
      const loginData = await loginRes.json();
      if (loginData.token) {
        token = loginData.token;
        console.log(`   ✅ Connecté avec ${admin.email}`);
        break;
      }
    } catch (e) {}
  }
  
  if (!token) {
    console.log('   ❌ Aucun admin trouvé');
    return;
  }
  
  // 2. Appeler l'endpoint alertes
  console.log('\n2. Appel /api/alertes/retards-absences...');
  try {
    const res = await fetch('http://localhost:5000/api/alertes/retards-absences', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    
    console.log('\n📊 RÉSULTAT:');
    console.log('   Success:', data.success);
    console.log('   Stats:', JSON.stringify(data.stats));
    console.log('   Alertes:', data.alertes?.length || 0);
    
    if (data.alertes && data.alertes.length > 0) {
      console.log('\n🚨 ALERTES DÉTECTÉES:');
      data.alertes.forEach((a, i) => {
        console.log(`\n   [${i+1}] ${a.employe}`);
        console.log(`       Type: ${a.type}`);
        console.log(`       Gravité: ${a.gravite}`);
        console.log(`       Message: ${a.message}`);
      });
    } else {
      console.log('\n   ✅ Aucune alerte (tous les employés OK)');
    }
    
  } catch (e) {
    console.log('   ❌ Erreur:', e.message);
  }
  
  // 3. Test endpoint employé
  console.log('\n\n3. Test /api/alertes/mon-statut (Marco)...');
  try {
    // Login Marco
    const marcoLogin = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'marco.romano@restaurant.com', password: 'Marco2025!' })
    });
    const marcoData = await marcoLogin.json();
    
    if (marcoData.token) {
      const statutRes = await fetch('http://localhost:5000/api/alertes/mon-statut', {
        headers: { 'Authorization': `Bearer ${marcoData.token}` }
      });
      const statut = await statutRes.json();
      
      console.log('   Statut:', statut.statut);
      console.log('   Shift:', JSON.stringify(statut.shift));
      console.log('   Rappel:', statut.rappel ? statut.rappel.message : 'Aucun');
    }
  } catch (e) {
    console.log('   ❌ Erreur:', e.message);
  }
}

testAlertes();
