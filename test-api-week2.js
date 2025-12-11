const axios = require('axios');

async function testAPI() {
  try {
    // Se connecter d'abord
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@test.com',
      password: 'Admin123!'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Connecté avec token');
    
    // Tester l'API de comparaison pour la semaine 2
    const params = new URLSearchParams({
      employeId: '56',
      dateDebut: '2025-12-08',
      dateFin: '2025-12-14'
    });
    
    const response = await axios.get(
      `http://localhost:5000/api/comparison/planning-vs-realite?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('\n📊 RÉSULTAT API:');
    console.log('Success:', response.data.success);
    console.log('Comparaisons:', response.data.comparaisons.length);
    
    response.data.comparaisons.forEach(comp => {
      console.log(`\n📅 ${comp.date}:`);
      console.log('  Planifié:', comp.planifie.length, 'segments');
      console.log('  Réel:', comp.reel.length, 'segments');
      console.log('  Écarts:', comp.ecarts.length);
      
      comp.ecarts.forEach((ecart, idx) => {
        console.log(`    Écart ${idx}:`, ecart.type, '-', ecart.ecartMin, 'min');
      });
    });
    
  } catch (err) {
    console.error('❌ Erreur:', err.response?.data || err.message);
  }
}

testAPI();
