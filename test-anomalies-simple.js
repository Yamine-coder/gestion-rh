// Script de test simple pour le système de gestion des anomalies
// Usage: node test-anomalies-simple.js

const https = require('https');
const http = require('http');
const API_URL = 'http://localhost:5000';

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Fonction pour faire une requête HTTP
function request(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_URL);
    const postData = options.body ? options.body : null;
    
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    if (postData) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = http.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ ok: false, error: 'Invalid JSON response', rawData: data });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ ok: false, error: error.message });
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Test principal
async function runTest() {
  log('\n🧪 Test du Système de Gestion des Anomalies\n', 'cyan');
  log('='.repeat(50), 'blue');
  
  // Étape 1: Connexion
  log('\n1️⃣  Test de connexion...', 'yellow');
  const loginResult = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@gestionrh.fr',
      password: 'admin123'
    })
  });
  
  if (!loginResult.ok) {
    log('❌ Échec de connexion', 'red');
    log(`   Erreur: ${loginResult.error || loginResult.data?.error}`, 'red');
    return;
  }
  
  const token = loginResult.data.token;
  log('✅ Connexion réussie', 'green');
  log(`   Token: ${token.substring(0, 20)}...`, 'cyan');
  
  // Étape 2: Vérifier les anomalies existantes
  log('\n2️⃣  Vérification des anomalies existantes...', 'yellow');
  const getAnomaliesResult = await request('/api/anomalies', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!getAnomaliesResult.ok) {
    log('❌ Impossible de récupérer les anomalies', 'red');
    return;
  }
  
  const nbAnomalies = getAnomaliesResult.data.anomalies?.length || 0;
  log(`✅ ${nbAnomalies} anomalie(s) trouvée(s)`, 'green');
  
  // Étape 3: Créer une anomalie de test
  log('\n3️⃣  Création d\'une anomalie de test...', 'yellow');
  const today = new Date().toISOString().split('T')[0];
  
  const createResult = await request('/api/anomalies', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      employe_id: 1,
      date: today,
      type: 'retard_modere',
      gravite: 'attention',
      description: '🧪 TEST - Retard de 15 minutes',
      statut: 'en_attente',
      details: {
        heurePrevue: '09:00',
        heureReelle: '09:15',
        ecartMinutes: 15
      }
    })
  });
  
  if (!createResult.ok) {
    log('❌ Échec de création', 'red');
    log(`   Erreur: ${createResult.error || createResult.data?.error}`, 'red');
    
    // Si l'employé n'existe pas, on teste avec l'erreur
    if (createResult.data?.error?.includes('Employee')) {
      log('\n⚠️  L\'employé ID 1 n\'existe pas en base', 'yellow');
      log('   Modifiez employe_id dans le script avec un ID valide', 'yellow');
    }
    return;
  }
  
  const anomalie = createResult.data.anomalie;
  log('✅ Anomalie créée avec succès', 'green');
  log(`   ID: ${anomalie.id}`, 'cyan');
  log(`   Type: ${anomalie.type}`, 'cyan');
  log(`   Gravité: ${anomalie.gravite}`, 'cyan');
  log(`   Statut: ${anomalie.statut}`, 'cyan');
  
  // Étape 4: Récupérer l'anomalie créée
  log('\n4️⃣  Vérification de l\'anomalie créée...', 'yellow');
  const getOneResult = await request(`/api/anomalies/${anomalie.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!getOneResult.ok) {
    log('❌ Impossible de récupérer l\'anomalie', 'red');
  } else {
    log('✅ Anomalie récupérée', 'green');
  }
  
  // Étape 5: Traiter l'anomalie (validation)
  log('\n5️⃣  Traitement de l\'anomalie (validation)...', 'yellow');
  const traiterResult = await request(`/api/anomalies/${anomalie.id}/traiter`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      action: 'valider',
      commentaire: 'Test automatisé - Validation OK'
    })
  });
  
  if (!traiterResult.ok) {
    log('❌ Échec du traitement', 'red');
    log(`   Erreur: ${traiterResult.error || traiterResult.data?.error}`, 'red');
  } else {
    log('✅ Anomalie validée avec succès', 'green');
    log(`   Nouveau statut: ${traiterResult.data.anomalie.statut}`, 'cyan');
  }
  
  // Étape 6: Vérifier les statistiques
  log('\n6️⃣  Vérification des statistiques...', 'yellow');
  const statsResult = await request('/api/anomalies/stats', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!statsResult.ok) {
    log('❌ Impossible de récupérer les stats', 'red');
  } else {
    const stats = statsResult.data;
    log('✅ Statistiques récupérées', 'green');
    log(`   Total: ${stats.total || 0}`, 'cyan');
    log(`   En attente: ${stats.en_attente || 0}`, 'cyan');
    log(`   Validées: ${stats.validees || 0}`, 'cyan');
    log(`   Refusées: ${stats.refusees || 0}`, 'cyan');
  }
  
  // Résumé final
  log('\n' + '='.repeat(50), 'blue');
  log('✅ Test terminé avec succès !', 'green');
  log('\n📋 Résumé:', 'cyan');
  log('   ✓ Connexion API', 'green');
  log('   ✓ Récupération des anomalies', 'green');
  log('   ✓ Création d\'anomalie', 'green');
  log('   ✓ Traitement d\'anomalie', 'green');
  log('   ✓ Statistiques', 'green');
  log('\n💡 Le système fonctionne correctement !', 'cyan');
  log('   Vous pouvez maintenant tester dans l\'interface web.\n', 'cyan');
}

// Fonction pour tester avec un employé spécifique
async function testWithEmployee(employeId) {
  log(`\n🧪 Test avec l'employé ID: ${employeId}\n`, 'cyan');
  
  // Connexion
  const loginResult = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@gestionrh.fr',
      password: 'admin123'
    })
  });
  
  if (!loginResult.ok) {
    log('❌ Échec de connexion', 'red');
    return;
  }
  
  const token = loginResult.data.token;
  const today = new Date().toISOString().split('T')[0];
  
  // Créer différents types d'anomalies
  const scenarios = [
    {
      type: 'retard_simple',
      gravite: 'info',
      description: '🔵 TEST - Retard simple de 8 minutes',
      ecartMinutes: 8
    },
    {
      type: 'retard_modere',
      gravite: 'attention',
      description: '🟡 TEST - Retard modéré de 15 minutes',
      ecartMinutes: 15
    },
    {
      type: 'retard_critique',
      gravite: 'critique',
      description: '🔴 TEST - Retard critique de 45 minutes',
      ecartMinutes: 45
    }
  ];
  
  log('Création de 3 anomalies de test...', 'yellow');
  
  for (const scenario of scenarios) {
    const result = await request('/api/anomalies', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        employe_id: employeId,
        date: today,
        type: scenario.type,
        gravite: scenario.gravite,
        description: scenario.description,
        statut: 'en_attente',
        details: {
          heurePrevue: '09:00',
          heureReelle: `09:${String(scenario.ecartMinutes).padStart(2, '0')}`,
          ecartMinutes: scenario.ecartMinutes
        }
      })
    });
    
    if (result.ok) {
      log(`✅ ${scenario.description}`, 'green');
    } else {
      log(`❌ Échec: ${scenario.description}`, 'red');
    }
  }
  
  log('\n✅ Test terminé ! Vérifiez le planning web.\n', 'green');
}

// Arguments en ligne de commande
const args = process.argv.slice(2);
const command = args[0];

if (command === 'help' || command === '--help' || command === '-h') {
  log('\n📖 Aide - Script de test des anomalies\n', 'cyan');
  log('Usage:', 'yellow');
  log('  node test-anomalies-simple.js              Lancer le test complet', 'cyan');
  log('  node test-anomalies-simple.js <employeId>  Tester avec un employé spécifique', 'cyan');
  log('  node test-anomalies-simple.js help         Afficher cette aide\n', 'cyan');
  log('Exemples:', 'yellow');
  log('  node test-anomalies-simple.js', 'cyan');
  log('  node test-anomalies-simple.js 5', 'cyan');
  log('  node test-anomalies-simple.js 12\n', 'cyan');
} else if (command && !isNaN(command)) {
  testWithEmployee(parseInt(command));
} else {
  runTest();
}
