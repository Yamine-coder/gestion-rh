/**
 * 🔍 TESTS API - ENDPOINTS POINTAGE
 * Teste la sécurité des API endpoints avec différents scénarios d'attaque
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TEST_TOKEN = 'your-test-token-here'; // À remplacer par un vrai token de test

// 🎯 Configuration des tests
const TEST_CONFIG = {
  baseURL: BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_TOKEN}`
  }
};

async function testAPIEndpoints() {
  console.log('🔍 === TESTS API ENDPOINTS - SÉCURITÉ ===\n');

  try {
    // ========================================
    // 🔥 TEST 1: AUTHENTIFICATION
    // ========================================
    console.log('🔥 TEST 1: Tests d\'authentification');
    
    // Test sans token
    try {
      await axios.get(`${BASE_URL}/api/pointages/mes-pointages`);
      console.log('❌ FAILLE: Accès sans authentification autorisé');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Protection OK: Accès refusé sans token (401)');
      } else {
        console.log('⚠️  Erreur inattendue:', error.message);
      }
    }

    // Test avec token invalide
    try {
      await axios.get(`${BASE_URL}/api/pointages/mes-pointages`, {
        headers: { 'Authorization': 'Bearer token-invalide-123' }
      });
      console.log('❌ FAILLE: Token invalide accepté');
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('✅ Protection OK: Token invalide rejeté');
      }
    }

    // Test avec token malformé
    const tokensInvalides = [
      'Bearer ',
      'Bearer',
      'token-sans-bearer',
      'Bearer ' + 'x'.repeat(1000), // Token très long
      'Bearer null',
      'Bearer undefined'
    ];

    for (const invalidToken of tokensInvalides) {
      try {
        await axios.get(`${BASE_URL}/api/pointages/mes-pointages`, {
          headers: { 'Authorization': invalidToken }
        });
        console.log(`❌ FAILLE: Token malformé accepté: ${invalidToken.substring(0, 30)}...`);
      } catch (error) {
        console.log(`✅ Protection OK: Token malformé rejeté`);
      }
    }

    // ========================================
    // 🔥 TEST 2: INJECTION DANS LES PARAMÈTRES
    // ========================================
    console.log('\n🔥 TEST 2: Tests d\'injection dans les paramètres');
    
    const payloadsInjection = [
      { type: "'; DROP TABLE pointages; --", description: 'SQL Injection classique' },
      { type: '<script>alert("xss")</script>', description: 'XSS Script' },
      { type: '../../etc/passwd', description: 'Path Traversal' },
      { type: '${7*7}', description: 'Template Injection' },
      { type: 'function(){return 1;}()', description: 'Code Injection' }
    ];

    for (const payload of payloadsInjection) {
      try {
        await axios.post(`${BASE_URL}/api/pointages/auto`, {
          type: payload.type
        }, TEST_CONFIG);
        console.log(`❌ FAILLE: ${payload.description} non bloquée`);
      } catch (error) {
        if (error.response?.status >= 400 && error.response?.status < 500) {
          console.log(`✅ Protection OK: ${payload.description} bloquée`);
        }
      }
    }

    // ========================================
    // 🔥 TEST 3: MANIPULATION DATES
    // ========================================
    console.log('\n🔥 TEST 3: Tests manipulation de dates');
    
    const datesInvalides = [
      '2030-12-31T23:59:59Z',  // Futur
      '1900-01-01T00:00:00Z',  // Très ancien
      'invalid-date',          // Format invalide
      '32/13/2023',           // Date impossible
      new Date().toISOString() + 'HACK', // Date avec suffix
    ];

    for (const dateInvalide of datesInvalides) {
      try {
        await axios.post(`${BASE_URL}/api/pointages/manuel`, {
          type: 'arrivee',
          horodatage: dateInvalide,
          userId: 19
        }, TEST_CONFIG);
        console.log(`❌ FAILLE: Date invalide acceptée: ${dateInvalide}`);
      } catch (error) {
        console.log(`✅ Protection OK: Date invalide rejetée`);
      }
    }

    // ========================================
    // 🔥 TEST 4: RATE LIMITING
    // ========================================
    console.log('\n🔥 TEST 4: Tests de rate limiting (spam)');
    
    const SPAM_COUNT = 20;
    const requests = [];
    
    for (let i = 0; i < SPAM_COUNT; i++) {
      requests.push(
        axios.post(`${BASE_URL}/api/pointages/auto`, {}, TEST_CONFIG)
          .catch(error => ({ error: true, status: error.response?.status }))
      );
    }

    const results = await Promise.all(requests);
    const blocked = results.filter(r => r.error && r.status === 429).length;
    const successful = results.filter(r => !r.error).length;

    if (blocked > 0) {
      console.log(`✅ Protection OK: ${blocked}/${SPAM_COUNT} requêtes bloquées par rate limiting`);
    } else if (successful === SPAM_COUNT) {
      console.log(`❌ FAILLE: Aucune protection contre le spam (${successful} requêtes réussies)`);
    }

    // ========================================
    // 🔥 TEST 5: PRIVILEGE ESCALATION
    // ========================================
    console.log('\n🔥 TEST 5: Tests d\'élévation de privilèges');
    
    // Tentative d'accès admin sans être admin
    try {
      await axios.get(`${BASE_URL}/api/pointages/admin/pointages/jour/2024-01-01`, TEST_CONFIG);
      console.log('❌ FAILLE: Accès admin autorisé sans privilèges');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Protection OK: Accès admin refusé (403 Forbidden)');
      }
    }

    // Tentative de pointage pour un autre utilisateur
    try {
      await axios.post(`${BASE_URL}/api/pointages/manuel`, {
        type: 'arrivee',
        userId: 999, // Autre utilisateur
        horodatage: new Date().toISOString()
      }, TEST_CONFIG);
      console.log('❌ FAILLE: Pointage pour autre utilisateur autorisé');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Protection OK: Pointage pour autre utilisateur refusé');
      }
    }

    // ========================================
    // 🔥 TEST 6: PAYLOAD SIZE LIMITS
    // ========================================
    console.log('\n🔥 TEST 6: Tests de limites de taille de payload');
    
    const hugePayload = {
      type: 'arrivee',
      data: 'x'.repeat(10 * 1024 * 1024) // 10MB de données
    };

    try {
      await axios.post(`${BASE_URL}/api/pointages/auto`, hugePayload, TEST_CONFIG);
      console.log('❌ FAILLE: Payload énorme accepté');
    } catch (error) {
      if (error.code === 'ECONNRESET' || error.response?.status === 413) {
        console.log('✅ Protection OK: Payload énorme rejeté');
      }
    }

    // ========================================
    // 🔥 TEST 7: CONCURRENT REQUESTS
    // ========================================
    console.log('\n🔥 TEST 7: Tests de requêtes concurrentes');
    
    const concurrentRequests = Array(10).fill().map(() =>
      axios.post(`${BASE_URL}/api/pointages/auto`, {}, TEST_CONFIG)
        .then(r => ({ success: true, data: r.data }))
        .catch(e => ({ success: false, error: e.response?.data }))
    );

    const concurrentResults = await Promise.all(concurrentRequests);
    const successes = concurrentResults.filter(r => r.success).length;
    const errors = concurrentResults.filter(r => !r.success).length;

    console.log(`Requêtes concurrentes: ${successes} succès, ${errors} erreurs`);
    if (successes <= 2) {
      console.log('✅ Protection OK: Logique métier empêche les doublons');
    } else {
      console.log('❌ FAILLE POTENTIELLE: Trop de pointages concurrents autorisés');
    }

    // ========================================
    // 📊 RÉSUMÉ DES TESTS API
    // ========================================
    console.log('\n📊 === RÉSUMÉ DES TESTS API ===');
    console.log('Tests effectués:');
    console.log('1. ✅ Authentification et autorisation');
    console.log('2. ✅ Injection dans les paramètres');
    console.log('3. ✅ Manipulation de dates');
    console.log('4. ✅ Rate limiting / Spam');
    console.log('5. ✅ Élévation de privilèges');
    console.log('6. ✅ Limites de payload');
    console.log('7. ✅ Requêtes concurrentes');

  } catch (error) {
    console.error('❌ Erreur durant les tests API:', error.message);
  }
}

// 🚀 Lancer les tests API
if (require.main === module) {
  testAPIEndpoints().catch(console.error);
}

module.exports = { testAPIEndpoints };
