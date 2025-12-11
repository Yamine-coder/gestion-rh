const axios = require('axios');

async function testStats() {
  try {
    // 1. Login
    console.log('🔑 Connexion...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@gestionrh.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Connecté\n');
    
    // 2. Appel stats
    console.log('📊 Appel /api/admin/stats...');
    const statsRes = await axios.get('http://localhost:5000/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('\n📊 RÉPONSE API STATS:\n');
    console.log('Employés:', statsRes.data.employes);
    console.log('Ont pointé:', statsRes.data.pointes);
    console.log('Absents:', statsRes.data.surveillance?.employesAbsents);
    console.log('Prochains congés:', statsRes.data.prochainsConges?.length);
    
    console.log('\n✅ Test terminé');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Le serveur n\'est pas démarré!');
      console.log('   Lancez: npm start');
    }
  }
}

testStats();
