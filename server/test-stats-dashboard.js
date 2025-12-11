const axios = require('axios');

async function testStats() {
  try {
    // Se connecter
    const loginRes = await axios.post('http://localhost:5000/auth/login', {
      email: 'admin@gestionrh.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Connecté en tant qu\'admin\n');
    
    // Récupérer les stats
    const statsRes = await axios.get('http://localhost:5000/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 STATS REÇUES:');
    console.log(JSON.stringify(statsRes.data, null, 2));
    
    // Vérifier les pointages du jour
    const date = new Date().toISOString().slice(0, 10);
    console.log(`\n⏰ POINTAGES DU ${date}:`);
    
    const pointagesRes = await axios.get(`http://localhost:5000/pointage/admin/pointages/jour/${date}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Nombre de pointages: ${pointagesRes.data.data?.length || 0}`);
    if (pointagesRes.data.data) {
      pointagesRes.data.data.forEach(p => {
        console.log(`  - ${p.user?.prenom} ${p.user?.nom}: ${p.blocs?.length || 0} bloc(s)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testStats();
