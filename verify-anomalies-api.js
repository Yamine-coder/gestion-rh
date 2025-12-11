/**
 * 🔍 Script de vérification rapide de l'API anomalies côté employé
 * 
 * Ce script simule ce que fait le frontend pour:
 * 1. Se connecter en tant qu'employé
 * 2. Récupérer ses anomalies du jour
 * 3. Vérifier que la sécurité fonctionne (ne voit que les siennes)
 */

const http = require('http');

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode < 300, status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ ok: false, status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testAnomaliesAPI() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 TEST API ANOMALIES - VUE EMPLOYÉ');
  console.log('═'.repeat(60));

  // 1. Connexion employé
  console.log('\n1️⃣  Connexion en tant qu\'employé...');
  
  const credentials = [
    { email: 'marco.romano@restaurant.com', password: 'password123' },
    { email: 'thomas.laurent@restaurant.com', password: 'password123' },
    { email: 'sophie.martin@restaurant.com', password: 'password123' }
  ];

  let token = null;
  let userEmail = null;
  let userId = null;

  for (const cred of credentials) {
    const login = await makeRequest('/auth/login', 'POST', cred);
    if (login.ok && login.data.token) {
      token = login.data.token;
      userEmail = cred.email;
      userId = login.data.user?.id;
      console.log(`   ✅ Connecté: ${cred.email} (ID: ${userId})`);
      break;
    }
  }

  if (!token) {
    console.log('   ❌ Impossible de se connecter');
    return;
  }

  // 2. Récupérer les anomalies du jour (comme Pointage.jsx)
  console.log('\n2️⃣  Récupération des anomalies du jour...');
  
  const today = new Date().toISOString().split('T')[0];
  const anomaliesJour = await makeRequest(
    `/api/anomalies?dateDebut=${today}&dateFin=${today}`,
    'GET',
    null,
    token
  );

  if (anomaliesJour.ok && anomaliesJour.data.success) {
    const anomalies = anomaliesJour.data.anomalies.filter(a => a.statut !== 'obsolete');
    console.log(`   ✅ ${anomalies.length} anomalie(s) aujourd'hui`);
    
    if (anomalies.length > 0) {
      console.log('\n   📋 Détails:');
      anomalies.forEach((a, idx) => {
        const emoji = a.gravite === 'critique' ? '🔴' :
                     a.gravite === 'attention' ? '🟡' :
                     a.gravite === 'a_valider' ? '🟠' :
                     a.gravite === 'hors_plage' ? '🟣' : '🟢';
        console.log(`      ${idx + 1}. ${emoji} ${a.type}`);
        console.log(`         Statut: ${a.statut}`);
        console.log(`         Description: ${a.description?.substring(0, 50)}...`);
      });
    }
  } else {
    console.log(`   ❌ Erreur: ${anomaliesJour.data?.error || anomaliesJour.status}`);
  }

  // 3. Récupérer l'historique (comme MesAnomalies.jsx)
  console.log('\n3️⃣  Récupération de l\'historique (30 derniers jours)...');
  
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - 30);
  
  const historique = await makeRequest(
    `/api/anomalies?dateDebut=${dateDebut.toISOString().split('T')[0]}&dateFin=${today}&limit=100`,
    'GET',
    null,
    token
  );

  if (historique.ok && historique.data.success) {
    const anomalies = historique.data.anomalies;
    console.log(`   ✅ ${anomalies.length} anomalie(s) sur les 30 derniers jours`);
    
    // Stats par statut
    const parStatut = anomalies.reduce((acc, a) => {
      acc[a.statut] = (acc[a.statut] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n   📊 Répartition par statut:');
    Object.entries(parStatut).forEach(([statut, count]) => {
      const emoji = statut === 'en_attente' ? '🔵' :
                   statut === 'validee' ? '✅' :
                   statut === 'refusee' ? '❌' :
                   statut === 'corrigee' ? '🔧' : '⚪';
      console.log(`      ${emoji} ${statut}: ${count}`);
    });

    // Vérifier la sécurité - toutes doivent appartenir à l'employé connecté
    console.log('\n4️⃣  Vérification de la sécurité...');
    
    const autresEmployes = anomalies.filter(a => a.employeId !== userId);
    if (autresEmployes.length === 0) {
      console.log('   ✅ SÉCURITÉ OK: Toutes les anomalies appartiennent à l\'employé connecté');
    } else {
      console.log(`   ❌ FAILLE SÉCURITÉ: ${autresEmployes.length} anomalies d'autres employés visibles!`);
    }
  } else {
    console.log(`   ❌ Erreur: ${historique.data?.error || historique.status}`);
  }

  // 5. Tester avec un admin pour comparaison
  console.log('\n5️⃣  Test comparatif avec un compte admin...');
  
  const adminLogin = await makeRequest('/auth/login', 'POST', {
    email: 'admin@gestionrh.com',
    password: 'admin123'
  });

  if (adminLogin.ok && adminLogin.data.token) {
    const adminAnomalies = await makeRequest(
      `/api/anomalies?dateDebut=${dateDebut.toISOString().split('T')[0]}&dateFin=${today}&limit=100`,
      'GET',
      null,
      adminLogin.data.token
    );

    if (adminAnomalies.ok && adminAnomalies.data.success) {
      console.log(`   ✅ Admin voit ${adminAnomalies.data.anomalies.length} anomalies (toutes)`);
      
      const employeIds = [...new Set(adminAnomalies.data.anomalies.map(a => a.employeId))];
      console.log(`   📊 L'admin voit les anomalies de ${employeIds.length} employé(s) différent(s)`);
    }
  } else {
    console.log('   ⚠️  Impossible de se connecter en admin pour comparaison');
  }

  // Résumé
  console.log('\n' + '═'.repeat(60));
  console.log('✅ TEST TERMINÉ');
  console.log('═'.repeat(60));
  console.log(`
📱 PROCHAINES ÉTAPES:

1. Ouvrez l'application React (npm start dans /client)
2. Connectez-vous avec: ${userEmail}
3. Vérifiez visuellement:
   - Page Pointage: widget "Anomalies du jour"
   - Page /mes-anomalies: historique complet avec filtres
`);
}

testAnomaliesAPI().catch(err => {
  console.error('\n❌ Erreur:', err.message);
});
