const axios = require('axios');

async function testAPI() {
  try {
    console.log('🧪 Test API planning-vs-realite pour Léa Garcia\n');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2NDQzMjA1MiwiZXhwIjoxNzY0NTE4NDUyfQ.GslWhIpMRJaWJNFkjqCGTW4Cwx5nM_YkLNodsoK7aBc';
    
    const response = await axios.get(
      'http://localhost:5000/api/comparison/planning-vs-realite',
      {
        params: {
          employeId: 56,
          dateDebut: '2025-11-29',
          dateFin: '2025-11-29'
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Réponse API:');
    console.log('Success:', response.data.success);
    console.log('Comparaisons:', response.data.comparaisons?.length || 0);
    
    if (response.data.comparaisons && response.data.comparaisons.length > 0) {
      console.log('\n📊 Détail des comparaisons:');
      response.data.comparaisons.forEach(comp => {
        console.log(`\n  Date: ${comp.date}`);
        console.log(`  Employé: ${comp.employeId}`);
        console.log(`  Écarts: ${comp.ecarts?.length || 0}`);
        if (comp.ecarts && comp.ecarts.length > 0) {
          comp.ecarts.forEach(ecart => {
            console.log(`    - ${ecart.type}:`);
            console.log(`      Prévu: ${ecart.heureArriveePrevu || '?'} → ${ecart.heureDepartPrevu || '?'}`);
            console.log(`      Réel: ${ecart.heureArriveeReelle || '?'} → ${ecart.heureDepartReelle || '?'}`);
            console.log(`      Durée: ${ecart.dureeMinutes}min`);
          });
        }
      });
    } else {
      console.log('\n⚠️ Aucune comparaison retournée!');
      console.log('Réponse complète:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testAPI();
