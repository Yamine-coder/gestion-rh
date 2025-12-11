// Test rapide pour vérifier les données via API

const token = process.argv[2];

if (!token) {
  console.log('Usage: node test-api-quick.js <token>');
  console.log('');
  console.log('Pour obtenir un token, connectez-vous avec:');
  console.log('  Email: marco.romano@restaurant.com');
  console.log('  Password: Marco123!');
  process.exit(1);
}

async function test() {
  const today = '2025-12-04';
  
  console.log('📅 Test pour:', today);
  console.log('');
  
  // Test anomalies
  console.log('🔍 Test /api/anomalies...');
  const anomaliesRes = await fetch(`http://localhost:5000/api/anomalies?dateDebut=${today}&dateFin=${today}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const anomalies = await anomaliesRes.json();
  console.log('   Status:', anomaliesRes.status);
  console.log('   Anomalies:', anomalies.anomalies?.length || 0);
  if (anomalies.anomalies?.length > 0) {
    anomalies.anomalies.forEach(a => {
      console.log(`   - ${a.type}: ${a.description}`);
    });
  }
  
  console.log('');
  
  // Test pointages
  console.log('🔍 Test /api/pointages/historique...');
  const pointagesRes = await fetch(`http://localhost:5000/api/pointages/historique`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const pointages = await pointagesRes.json();
  console.log('   Status:', pointagesRes.status);
  console.log('   Pointages:', pointages.pointages?.length || 0);
  if (pointages.pointages?.length > 0) {
    pointages.pointages.forEach(p => {
      const time = new Date(p.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      console.log(`   - ${time} ${p.type}`);
    });
  }
  
  console.log('');
  console.log('✅ Test terminé');
}

test().catch(console.error);
