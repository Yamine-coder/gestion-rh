const axios = require('axios');

async function main() {
  // Login pour obtenir le token
  const loginRes = await axios.post('http://localhost:5000/auth/login', {
    email: 'yjordan496@gmail.com',
    password: 'Test1234!'
  });
  
  const token = loginRes.data.token;
  console.log('✅ Token obtenu');
  
  // Date du jour
  const today = new Date().toISOString().split('T')[0];
  console.log('\n📅 Date recherchée:', today);
  
  // Test API mes-shifts
  console.log('\n🔍 Test /shifts/mes-shifts...');
  const shiftsRes = await axios.get(`http://localhost:5000/shifts/mes-shifts?start=${today}&end=${today}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Réponse shifts:', JSON.stringify(shiftsRes.data, null, 2));
  
  // Test API total-aujourdhui
  console.log('\n🔍 Test /pointage/total-aujourdhui...');
  const totalRes = await axios.get('http://localhost:5000/pointage/total-aujourdhui', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Réponse total:', JSON.stringify(totalRes.data, null, 2));
  
  // Test API historique
  console.log('\n🔍 Test /pointage/historique...');
  const histRes = await axios.get('http://localhost:5000/pointage/historique', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Réponse historique:', histRes.data.length, 'pointages');
  histRes.data.forEach(p => {
    console.log('  -', p.type, ':', new Date(p.horodatage).toLocaleString('fr-FR'));
  });
}

main().catch(err => {
  console.error('Erreur:', err.response?.data || err.message);
});
