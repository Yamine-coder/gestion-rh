const axios = require('axios');

async function testMoussAPI() {
  try {
    console.log('🔐 Test de connexion pour test@Mouss.com...\n');
    
    // Connexion avec le bon mot de passe
    const loginRes = await axios.post('http://localhost:5000/auth/login', {
      email: 'test@Mouss.com',
      password: '7704154915Ym@!!'  // Le bon mot de passe
    });
    
    const token = loginRes.data.token;
    console.log('✅ Connexion réussie !');
    console.log('🔑 Token:', token.substring(0, 50) + '...\n');
    
    // Test mes-pointages
    console.log('📍 Test /pointage/mes-pointages:');
    const mesPointages = await axios.get('http://localhost:5000/pointage/mes-pointages', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Status:', mesPointages.status);
    console.log('   Nombre de pointages:', mesPointages.data.length);
    console.log('   Données:', JSON.stringify(mesPointages.data, null, 2));
    
    // Test total-aujourdhui
    console.log('\n⏰ Test /pointage/total-aujourdhui:');
    const totalRes = await axios.get('http://localhost:5000/pointage/total-aujourdhui', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Status:', totalRes.status);
    console.log('   Données:', JSON.stringify(totalRes.data, null, 2));
    
    // Test mes-pointages-aujourdhui
    console.log('\n📅 Test /pointage/mes-pointages-aujourdhui:');
    try {
      const todayRes = await axios.get('http://localhost:5000/pointage/mes-pointages-aujourdhui', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   Status:', todayRes.status);
      console.log('   Nombre de pointages aujourd\'hui:', todayRes.data.length);
      console.log('   Données:', JSON.stringify(todayRes.data, null, 2));
    } catch (todayErr) {
      console.log('   ❌ Erreur:', todayErr.response?.status, todayErr.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.status, error.response?.data || error.message);
  }
}

testMoussAPI();
