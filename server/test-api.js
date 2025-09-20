// Test direct de l'API pour voir si elle fonctionne

const axios = require('axios');

async function testAPI() {
  try {
    console.log('🧪 Test de l\'API rapport...');
    
    // D'abord tester la connexion
    const loginResponse = await axios.post('http://localhost:5000/auth/login', {
      email: 'test@admin.com',
      password: 'test123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login réussi');
    
    // Tester l'endpoint rapport pour l'employé 2
    const employeId = 2;
    console.log(`📊 Test rapport pour employé ${employeId}...`);
    
    const rapportResponse = await axios.get(`http://localhost:5000/api/stats/employe/${employeId}/rapport`, {
      params: { periode: 'mois' },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Réponse API reçue:');
    console.log('Heures prévues:', rapportResponse.data.heuresPreveues);
    console.log('Heures travaillées:', rapportResponse.data.heuresTravaillees);
    console.log('Heures par jour:', rapportResponse.data.heuresParJour?.length || 0, 'entrées');
    
    return rapportResponse.data;
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testAPI();
