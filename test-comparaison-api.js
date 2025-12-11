const axios = require('axios');

const API_URL = 'http://localhost:5000';
const TEST_USER_ID = 110; // Moussaoui Yami

async function testComparaisonAPI() {
  try {
    // 1. D'abord, on se connecte pour avoir un token
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@gestionrh.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Connecté avec token');
    
    // 2. Tester l'API de comparaison pour la semaine du 2-8 décembre 2025
    const params = new URLSearchParams({
      employeId: TEST_USER_ID.toString(),
      dateDebut: '2025-12-02',
      dateFin: '2025-12-08'
    });
    
    console.log(`\n📡 Requête API: /api/comparison/planning-vs-realite?${params}`);
    
    const response = await axios.get(
      `${API_URL}/api/comparison/planning-vs-realite?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('\n📊 Réponse API:');
    console.log('Success:', response.data.success);
    console.log('Nombre de comparaisons:', response.data.comparaisons?.length || 0);
    
    if (response.data.comparaisons && response.data.comparaisons.length > 0) {
      console.log('\n📅 Détail par date:');
      
      for (const comp of response.data.comparaisons) {
        console.log(`\n=== ${comp.date} ===`);
        console.log('  Employé:', comp.employeId);
        console.log('  Prévu:', JSON.stringify(comp.prevu, null, 2));
        console.log('  Réel:', JSON.stringify(comp.reel, null, 2));
        console.log('  Nombre d\'écarts:', comp.ecarts?.length || 0);
        
        if (comp.ecarts && comp.ecarts.length > 0) {
          console.log('  Écarts détaillés:');
          for (const ecart of comp.ecarts) {
            console.log(`    - Type: ${ecart.type}`);
            console.log(`      Gravité: ${ecart.gravite}`);
            console.log(`      Description: ${ecart.description}`);
            console.log(`      Durée: ${ecart.dureeMinutes} min`);
            console.log('');
          }
        }
      }
    } else {
      console.log('\n⚠️ Aucune comparaison trouvée!');
      console.log('Vérifiez que les shifts et pointages existent pour cette période.');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testComparaisonAPI();
