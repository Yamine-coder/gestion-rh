/**
 * TEST DE VALIDATION DES CHAMPS OBLIGATOIRES
 * ==========================================
 * 
 * Ce script teste que les champs obligatoires empêchent bien
 * la création d'un employé si non remplis
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@fastfood.com';
const ADMIN_PASSWORD = 'Admin2024!';

let token = null;

// Fonction pour se connecter en tant qu'admin
async function login() {
  console.log('\n🔐 Connexion admin...');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    token = response.data.token;
    console.log('✅ Connexion réussie\n');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.response?.data || error.message);
    return false;
  }
}

// Fonction pour tester la création avec données manquantes
async function testCreationInvalide(testName, data, expectedErrorCode) {
  console.log(`\n📝 Test: ${testName}`);
  console.log('   Données:', JSON.stringify(data, null, 2));
  
  try {
    const response = await axios.post(
      `${API_URL}/admin/employes`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('   ❌ ÉCHEC: La création a réussi alors qu\'elle devrait échouer');
    console.log('   Response:', response.data);
    return false;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      const errorCode = error.response.data.code;
      const errorMessage = error.response.data.error;
      
      if (errorCode === expectedErrorCode) {
        console.log(`   ✅ SUCCÈS: Validation correcte`);
        console.log(`   Code: ${errorCode}`);
        console.log(`   Message: ${errorMessage}`);
        return true;
      } else {
        console.log(`   ⚠️ ERREUR INATTENDUE:`);
        console.log(`   Attendu: ${expectedErrorCode}`);
        console.log(`   Reçu: ${errorCode}`);
        console.log(`   Message: ${errorMessage}`);
        return false;
      }
    } else {
      console.log('   ❌ ÉCHEC: Erreur inattendue');
      console.log('   Status:', error.response?.status);
      console.log('   Data:', error.response?.data);
      return false;
    }
  }
}

// Fonction pour tester la création valide
async function testCreationValide() {
  console.log('\n📝 Test: Création valide avec tous les champs obligatoires');
  
  const data = {
    email: `test.validation.${Date.now()}@exemple.com`,
    nom: 'TestNom',
    prenom: 'TestPrenom',
    telephone: '06 12 34 56 78',
    categorie: 'Cuisine',
    dateEmbauche: new Date().toISOString().split('T')[0],
    role: 'employee'
  };
  
  console.log('   Données:', JSON.stringify(data, null, 2));
  
  try {
    const response = await axios.post(
      `${API_URL}/admin/employes`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('   ✅ SUCCÈS: Employé créé');
    console.log('   ID:', response.data.user.id);
    console.log('   Email:', response.data.user.email);
    console.log('   Mot de passe temporaire généré: [MASQUÉ]');
    
    // Nettoyer: supprimer l'employé de test
    try {
      // D'abord marquer le départ
      await axios.put(
        `${API_URL}/admin/employes/${response.data.user.id}/depart`,
        {
          dateSortie: new Date().toISOString().split('T')[0],
          motifDepart: 'test',
          commentaireDepart: 'Test de validation - employé temporaire'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Puis supprimer
      await axios.delete(
        `${API_URL}/admin/employes/${response.data.user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('   🗑️ Employé de test nettoyé');
    } catch (cleanupError) {
      console.log('   ⚠️ Avertissement: Impossible de nettoyer l\'employé de test');
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ ÉCHEC: La création a échoué');
    console.log('   Status:', error.response?.status);
    console.log('   Error:', error.response?.data);
    return false;
  }
}

// Tests principaux
async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🧪 TEST DE VALIDATION DES CHAMPS OBLIGATOIRES');
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Se connecter
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Impossible de continuer sans connexion\n');
    process.exit(1);
  }
  
  const results = [];
  
  // Test 1: Email manquant
  results.push(await testCreationInvalide(
    'Email manquant',
    {
      nom: 'Test',
      prenom: 'User',
      telephone: '0612345678',
      categorie: 'Cuisine',
      role: 'employee'
    },
    'EMAIL_REQUIRED'
  ));
  
  // Test 2: Email vide
  results.push(await testCreationInvalide(
    'Email vide',
    {
      email: '   ',
      nom: 'Test',
      prenom: 'User',
      telephone: '0612345678',
      categorie: 'Cuisine',
      role: 'employee'
    },
    'EMAIL_REQUIRED'
  ));
  
  // Test 3: Email invalide
  results.push(await testCreationInvalide(
    'Format email invalide',
    {
      email: 'email-invalide',
      nom: 'Test',
      prenom: 'User',
      telephone: '0612345678',
      categorie: 'Cuisine',
      role: 'employee'
    },
    'EMAIL_INVALID'
  ));
  
  // Test 4: Nom manquant
  results.push(await testCreationInvalide(
    'Nom manquant',
    {
      email: 'test@exemple.com',
      prenom: 'User',
      telephone: '0612345678',
      categorie: 'Cuisine',
      role: 'employee'
    },
    'NOM_REQUIRED'
  ));
  
  // Test 5: Prénom manquant
  results.push(await testCreationInvalide(
    'Prénom manquant',
    {
      email: 'test@exemple.com',
      nom: 'Test',
      telephone: '0612345678',
      categorie: 'Cuisine',
      role: 'employee'
    },
    'PRENOM_REQUIRED'
  ));
  
  // Test 6: Catégorie manquante
  results.push(await testCreationInvalide(
    'Catégorie manquante',
    {
      email: 'test@exemple.com',
      nom: 'Test',
      prenom: 'User',
      telephone: '0612345678',
      role: 'employee'
    },
    'CATEGORIE_REQUIRED'
  ));
  
  // Test 7: Téléphone invalide (7 chiffres)
  results.push(await testCreationInvalide(
    'Téléphone invalide (7 chiffres)',
    {
      email: 'test@exemple.com',
      nom: 'Test',
      prenom: 'User',
      telephone: '0612345',
      categorie: 'Cuisine',
      role: 'employee'
    },
    'TELEPHONE_INVALID'
  ));
  
  // Test 8: Téléphone invalide (12 chiffres)
  results.push(await testCreationInvalide(
    'Téléphone invalide (12 chiffres)',
    {
      email: 'test@exemple.com',
      nom: 'Test',
      prenom: 'User',
      telephone: '061234567890',
      categorie: 'Cuisine',
      role: 'employee'
    },
    'TELEPHONE_INVALID'
  ));
  
  // Test 9: Création valide
  results.push(await testCreationValide());
  
  // Résultats
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 RÉSULTATS DES TESTS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const passed = results.filter(r => r === true).length;
  const failed = results.filter(r => r === false).length;
  const total = results.length;
  
  console.log(`✅ Tests réussis: ${passed}/${total}`);
  console.log(`❌ Tests échoués: ${failed}/${total}`);
  console.log(`📈 Taux de réussite: ${Math.round((passed / total) * 100)}%\n`);
  
  if (failed === 0) {
    console.log('🎉 Tous les tests sont passés avec succès!\n');
    console.log('✅ La validation des champs obligatoires fonctionne correctement\n');
  } else {
    console.log('⚠️ Certains tests ont échoué. Veuillez vérifier.\n');
    process.exit(1);
  }
}

// Exécuter les tests
runTests().catch(error => {
  console.error('\n❌ Erreur fatale:', error.message);
  process.exit(1);
});
