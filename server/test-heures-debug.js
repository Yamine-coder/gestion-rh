const axios = require('axios');

const testerHeures = async () => {
  try {
    // Test avec admin existant
    const loginResponse = await axios.post('http://127.0.0.1:5000/auth/login', {
      email: 'test@admin.com',
      password: 'test123'
    });

    console.log('✅ Connexion réussie');
    const token = loginResponse.data.token;

    // Appel API des stats
    const statsResponse = await axios.get('http://127.0.0.1:5000/admin/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n📊 Statistiques reçues:');
    console.log(`- Employés: ${statsResponse.data.employes}`);
    console.log(`- Pointés aujourd'hui: ${statsResponse.data.pointes}`);
    console.log(`- Heures travaillées: ${statsResponse.data.totalHeures}`);
    console.log(`- Taux pointage: ${Math.round((statsResponse.data.pointes / statsResponse.data.employes) * 100)}%`);

    // Test direct de calcul des heures aujourd'hui
    console.log('\n🔍 Détails surveillance:');
    const surveillance = statsResponse.data.surveillance || {};
    console.log(`- Absents: ${surveillance.employesAbsents || 0}`);
    console.log(`- En retard: ${surveillance.employesEnRetard || 0}`);
    console.log(`- Écart planning: ${surveillance.employesEcartPlanning || 0}`);
    console.log(`- Total éléments: ${surveillance.totalElements || 0}`);
    console.log(`- Période: ${surveillance.periode || 'N/A'}`);

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
};

testerHeures();
