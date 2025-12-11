const axios = require('axios');

async function testStatsAPI() {
  try {
    // D'abord se connecter en tant qu'admin
    console.log('🔑 Connexion en tant qu\'admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@gestionrh.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Connecté avec succès\n');
    
    // Tester l'API stats
    console.log('📊 Appel de l\'API /admin/stats...');
    const statsResponse = await axios.get('http://localhost:5000/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n=== RÉPONSE API STATS ===\n');
    console.log(JSON.stringify(statsResponse.data, null, 2));
    
    // Tester l'API comparaisons
    console.log('\n\n📊 Appel de l\'API /admin/comparaisons...');
    const comparaisonsResponse = await axios.get('http://localhost:5000/api/admin/comparaisons', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        date: '2025-10-21'
      }
    });
    
    console.log('\n=== RÉPONSE API COMPARAISONS ===\n');
    console.log(`Nombre de comparaisons: ${comparaisonsResponse.data.length}`);
    if (comparaisonsResponse.data.length > 0) {
      console.log('\nDétails:');
      comparaisonsResponse.data.forEach(comp => {
        console.log(`\n- ${comp.nomComplet || comp.nom}`);
        console.log(`  Planning: ${comp.heureDebutPlanifiee || 'N/A'} → ${comp.heureFinPlanifiee || 'N/A'}`);
        console.log(`  Pointage: ${comp.heureArrivee || 'N/A'} → ${comp.heureDepart || 'N/A'}`);
        console.log(`  Écart arrivée: ${comp.ecartArrivee || 'N/A'}`);
        console.log(`  Écart départ: ${comp.ecartDepart || 'N/A'}`);
        console.log(`  Statut: ${comp.statut || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testStatsAPI();
