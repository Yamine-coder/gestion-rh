// Script de test pour vérifier que le rapport fonctionne
const axios = require('axios');

async function testRapport() {
  try {
    console.log('🔍 Test du système de rapport...');
    
    // Test avec l'employé ID 54 mentionné dans les logs
    const response = await axios.get('http://localhost:5000/api/rapports/employe/54', {
      params: {
        periode: 'mois',
        mois: '2025-08'
      }
    });
    
    console.log('✅ Rapport généré avec succès !');
    console.log('📊 Données reçues:');
    console.log('- Employé:', response.data.employe?.nom, response.data.employe?.prenom);
    console.log('- Heures prévues:', response.data.heuresPreveues);
    console.log('- Heures travaillées:', response.data.heuresTravaillees);
    console.log('- Retards:', response.data.nombreRetards);
    console.log('- Points de données par jour:', response.data.heuresParJour?.length);
    
  } catch (error) {
    console.error('❌ Erreur lors du test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testRapport();
