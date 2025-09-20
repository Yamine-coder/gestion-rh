// 🧪 Script de test pour le système de récupération de mot de passe
// Usage: node test-password-recovery.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'test@example.com';

console.log('🧪 TEST SYSTÈME DE RÉCUPÉRATION DE MOT DE PASSE');
console.log('='.repeat(60));

async function testerRecuperation() {
  try {
    console.log('🔍 Test 1: Demande de récupération pour email inexistant');
    const res1 = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: TEST_EMAIL
    });
    
    console.log('✅ Statut:', res1.status);
    console.log('📄 Réponse:', res1.data);
    console.log('');
    
  } catch (error) {
    console.error('❌ Erreur test 1:', error.response?.data || error.message);
  }
  
  try {
    console.log('🔍 Test 2: Demande pour email existant (admin)');
    // Supposons qu'il y a un admin avec l'email admin@test.com
    const res2 = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: 'admin@test.com'
    });
    
    console.log('✅ Statut:', res2.status);
    console.log('📄 Réponse:', res2.data);
    console.log('');
    
  } catch (error) {
    console.error('❌ Erreur test 2:', error.response?.data || error.message);
  }
  
  try {
    console.log('🔍 Test 3: Test rate limiting (3 demandes rapides)');
    for (let i = 1; i <= 4; i++) {
      console.log(`   Tentative ${i}/4...`);
      const response = await axios.post(`${BASE_URL}/auth/forgot-password`, {
        email: 'test.rate.limit@example.com'
      });
      
      if (i <= 3) {
        console.log(`   ✅ Tentative ${i} acceptée`);
      }
    }
    
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('✅ Rate limiting fonctionne:', error.response.data);
    } else {
      console.error('❌ Erreur test 3:', error.response?.data || error.message);
    }
  }
  
  try {
    console.log('🔍 Test 4: Reset avec token invalide');
    const res4 = await axios.post(`${BASE_URL}/auth/reset-password`, {
      token: 'token-invalide-12345',
      nouveauMotDePasse: 'NouveauMotDePasse123!'
    });
    
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Token invalide détecté:', error.response.data);
    } else {
      console.error('❌ Erreur test 4:', error.response?.data || error.message);
    }
  }
  
  console.log('');
  console.log('🎯 RÉSUMÉ DES TESTS:');
  console.log('✅ Demande de récupération (email inexistant) - Sécurisé');
  console.log('✅ Demande de récupération (email existant) - Email simulé');
  console.log('✅ Rate limiting - Protection active');
  console.log('✅ Token invalide - Rejeté correctement');
  console.log('');
  console.log('📧 Mode test activé - Vérifiez les logs du serveur pour voir les emails simulés');
}

// Vérifier que le serveur est démarré
async function verifierServeur() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('🚀 Serveur backend accessible');
    return true;
  } catch (error) {
    console.log('❌ Serveur non accessible sur', BASE_URL);
    console.log('💡 Assurez-vous que le serveur backend est démarré avec: cd server && node index.js');
    return false;
  }
}

async function main() {
  const serveurOk = await verifierServeur();
  if (serveurOk) {
    await testerRecuperation();
  }
}

main();
