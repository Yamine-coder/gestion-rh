// Test de l'annulation de départ
const axios = require('axios');

const TEST_CONFIG = {
  baseURL: 'http://localhost:5000',
  // Remplacez par votre token admin valide
  token: 'VOTRE_TOKEN_ICI',
  // ID d'un employé avec dateSortie renseignée
  employeId: 1
};

async function testAnnulerDepart() {
  console.log('🧪 Test annulation départ\n');
  
  try {
    // 1. Vérifier l'état initial
    console.log('1️⃣ Récupération état initial...');
    const getResponse = await axios.get(
      `${TEST_CONFIG.baseURL}/admin/employes/${TEST_CONFIG.employeId}`,
      { headers: { Authorization: `Bearer ${TEST_CONFIG.token}` } }
    );
    
    console.log('État initial:', {
      id: getResponse.data.id,
      nom: `${getResponse.data.prenom} ${getResponse.data.nom}`,
      statut: getResponse.data.statut,
      dateSortie: getResponse.data.dateSortie,
      motifDepart: getResponse.data.motifDepart
    });
    
    if (!getResponse.data.dateSortie) {
      console.log('⚠️ Cet employé n\'a pas de départ enregistré. Impossible de tester l\'annulation.');
      return;
    }
    
    // 2. Annuler le départ
    console.log('\n2️⃣ Annulation du départ...');
    const annulerResponse = await axios.put(
      `${TEST_CONFIG.baseURL}/admin/employes/${TEST_CONFIG.employeId}/annuler-depart`,
      {},
      { headers: { Authorization: `Bearer ${TEST_CONFIG.token}` } }
    );
    
    console.log('✅ Réponse annulation:', {
      statut: annulerResponse.data.statut,
      dateSortie: annulerResponse.data.dateSortie,
      motifDepart: annulerResponse.data.motifDepart
    });
    
    // 3. Vérifier l'état final
    console.log('\n3️⃣ Vérification état final...');
    const verifyResponse = await axios.get(
      `${TEST_CONFIG.baseURL}/admin/employes/${TEST_CONFIG.employeId}`,
      { headers: { Authorization: `Bearer ${TEST_CONFIG.token}` } }
    );
    
    console.log('État final:', {
      statut: verifyResponse.data.statut,
      dateSortie: verifyResponse.data.dateSortie,
      motifDepart: verifyResponse.data.motifDepart
    });
    
    // 4. Vérifications
    console.log('\n📊 Vérifications:');
    const checks = {
      'Statut = actif': verifyResponse.data.statut === 'actif',
      'dateSortie = null': verifyResponse.data.dateSortie === null,
      'motifDepart = null': verifyResponse.data.motifDepart === null
    };
    
    Object.entries(checks).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}`);
    });
    
    const allPassed = Object.values(checks).every(v => v);
    console.log(allPassed ? '\n🎉 Test RÉUSSI' : '\n❌ Test ÉCHOUÉ');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n💡 Tip: Mettez à jour TEST_CONFIG.token avec un token admin valide');
    }
  }
}

// Exécuter le test
testAnnulerDepart();
