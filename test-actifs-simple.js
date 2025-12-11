const https = require('http');

const BASE_URL = 'http://localhost:5000';
let token = '';

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('\n🔍 VÉRIFICATION DES EMPLOYÉS ACTIFS\n');
  console.log('=' .repeat(50));

  // 1. Login
  console.log('\n1️⃣  Connexion admin...');
  const loginData = await request('POST', '/auth/login', {
    email: 'admin@restaurant.com',
    password: 'Admin123!'
  });
  token = loginData.token;
  console.log('✅ Connecté');

  // 2. Stats
  console.log('\n2️⃣  Récupération des statistiques...');
  const stats = await request('GET', '/stats');
  
  console.log('\n📊 STATISTIQUES:');
  console.log('   Employés ACTIFS (en service):', stats.employesActifs || stats.employes);
  console.log('   Employés TOTAL (avec inactifs):', stats.totalEmployes || 'N/A');
  console.log('   Employés INACTIFS:', stats.employesInactifs || 'N/A');

  // 3. Export
  console.log('\n3️⃣  Test de l\'export...');
  
  // Test 1: Export JSON pour compter
  const periode = 'mois';
  const mois = '2025-11';
  
  try {
    const exportData = await request('GET', `/rapports/export-all?periode=${periode}&mois=${mois}&format=json`);
    
    if (exportData && exportData.data) {
      const nbEmployes = exportData.data.length;
      console.log('\n📋 RÉSULTAT EXPORT:');
      console.log('   Nombre d\'employés dans le rapport:', nbEmployes);
      
      console.log('\n🎯 VALIDATION:');
      const expected = stats.employesActifs || stats.employes;
      if (nbEmployes === expected) {
        console.log(`   ✅ CORRECT: ${nbEmployes} employés = ${expected} actifs`);
      } else {
        console.log(`   ❌ ERREUR: ${nbEmployes} employés ≠ ${expected} actifs`);
        console.log(`   Le rapport devrait contenir UNIQUEMENT les employés actifs!`);
      }
      
      // Afficher quelques employés pour vérification
      console.log('\n👥 Premiers employés du rapport:');
      exportData.data.slice(0, 5).forEach((emp, i) => {
        console.log(`   ${i+1}. ${emp.nom} ${emp.prenom} (${emp.email})`);
      });
      
    } else {
      console.log('⚠️  Format de réponse inattendu');
    }
  } catch (error) {
    console.log('⚠️  Export JSON non disponible:', error.message);
    console.log('\n💡 Vérification manuelle requise:');
    console.log('   1. Télécharger le rapport Excel');
    console.log('   2. Compter les lignes (hors en-tête)');
    console.log(`   3. Vérifier que le nombre = ${stats.employesActifs || stats.employes}`);
  }

  console.log('\n' + '='.repeat(50) + '\n');
}

main().catch(err => {
  console.error('\n❌ Erreur:', err.message);
  process.exit(1);
});
