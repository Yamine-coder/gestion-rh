const axios = require('axios');

// Test direct de l'API surveillance
async function checkSurveillance() {
  try {
    // Login admin pour récupérer un token valide
    const loginResponse = await axios.post('http://localhost:5000/login', {
      email: 'test@admin.com',
      password: 'test123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login admin réussi');
    
    // Récupérer les stats de surveillance
    const statsResponse = await axios.get('http://localhost:5000/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const surveillance = statsResponse.data.surveillance;
    
    console.log('\n=== DONNÉES SURVEILLANCE ===');
    console.log(`Employés absents: ${surveillance.employesAbsents} (affiché: ${surveillance.employesAbsents > 0 ? 'OUI' : 'NON'})`);
    console.log(`Employés en retard: ${surveillance.employesEnRetard} (affiché: ${surveillance.employesEnRetard > 0 ? 'OUI' : 'NON'})`);
    console.log(`Employés écart planning: ${surveillance.employesEcartPlanning} (affiché: ${surveillance.employesEcartPlanning > 0 ? 'OUI' : 'NON'})`);
    console.log(`Total éléments: ${surveillance.totalElements}`);
    console.log(`Période: ${surveillance.periode}`);
    
    console.log('\n=== LOGIQUE D\'AFFICHAGE ===');
    if (surveillance.employesAbsents > 0) {
      console.log(`✅ ABSENTS: ${surveillance.employesAbsents} employé(s) absent(s)`);
    } else {
      console.log(`❌ ABSENTS: ${surveillance.employesAbsents} (non affiché car <= 0)`);
    }
    
    if (surveillance.employesEnRetard > 0) {
      console.log(`✅ RETARDS: ${surveillance.employesEnRetard} employé(s) en retard`);
    } else {
      console.log(`❌ RETARDS: ${surveillance.employesEnRetard} (non affiché car <= 0)`);
    }
    
    if (surveillance.employesEcartPlanning > 0) {
      console.log(`✅ PLANNING: ${surveillance.employesEcartPlanning} employé(s) écart planning`);
    } else {
      console.log(`❌ PLANNING: ${surveillance.employesEcartPlanning} (non affiché car <= 0)`);
    }
    
    if (surveillance.totalElements === 0) {
      console.log('\n🟢 MESSAGE: "Aucun élément à surveiller cette semaine"');
    } else {
      console.log(`\n🟡 ÉLÉMENTS À AFFICHER: ${surveillance.totalElements} éléments`);
    }
    
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

checkSurveillance();
