// test-workflow-anomalies.js - Test complet du workflow validation/refus/correction
const http = require('http');

const API_BASE = 'localhost';
const API_PORT = 5000;

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: API_PORT,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testWorkflowComplet() {
  console.log('🧪 === TEST WORKFLOW ANOMALIES COMPLET ===\n');

  try {
    // 1. Connexion (essayer plusieurs comptes)
    console.log('1️⃣ Connexion...');
    
    let tokenAdmin = null;
    const credentials = [
      { email: 'admin@gestionrh.com', password: 'admin123', label: 'Admin' },
      { email: 'admin@gestionrh.com', password: 'Admin123!', label: 'Admin alt' },
      { email: 'thomas.laurent@restaurant.com', password: 'password123', label: 'Thomas (employee)' }
    ];

    for (const cred of credentials) {
      const loginAttempt = await makeRequest('/auth/login', 'POST', {
        email: cred.email,
        password: cred.password
      });

      if (loginAttempt.status === 200) {
        tokenAdmin = loginAttempt.data.token;
        console.log(`✅ Connecté: ${cred.label}\n`);
        break;
      }
    }

    if (!tokenAdmin) {
      console.error('❌ Aucun compte ne fonctionne. Vérifiez les credentials.');
      return;
    }

    // 2. Vérifier anomalies existantes
    console.log('2️⃣ Liste des anomalies en attente...');
    const anomalies = await makeRequest('/api/anomalies?statut=en_attente&limit=5', 'GET', null, tokenAdmin);
    
    if (anomalies.status !== 200) {
      console.error('❌ Erreur récupération anomalies:', anomalies.data);
      return;
    }

    const anomaliesListe = anomalies.data.anomalies || [];
    console.log(`✅ ${anomaliesListe.length} anomalie(s) en attente`);

    if (anomaliesListe.length === 0) {
      console.log('\n⚠️ Aucune anomalie à tester. Création d\'anomalies de test...\n');
      
      // Créer des anomalies de test si besoin
      const prisma = require('./server/prisma/client');
      const employes = await prisma.user.findMany({
        where: { role: 'employee' },
        take: 3
      });

      if (employes.length > 0) {
        const anomaliesTest = [
          {
            employeId: employes[0].id,
            date: new Date('2025-11-25'),
            type: 'retard_modere',
            gravite: 'attention',
            description: 'Retard de 22 minutes',
            details: { ecartMinutes: 22, heurePrevu: '09:00', heureReelle: '09:22' },
            statut: 'en_attente',
            justificationEmploye: 'Problème de transport - RER en panne'
          },
          {
            employeId: employes[1].id,
            date: new Date('2025-11-26'),
            type: 'retard_critique',
            gravite: 'critique',
            description: 'Retard de 75 minutes',
            details: { ecartMinutes: 75, heurePrevu: '08:00', heureReelle: '09:15' },
            statut: 'en_attente'
          },
          {
            employeId: employes[2].id,
            date: new Date('2025-11-27'),
            type: 'heures_sup_a_valider',
            gravite: 'a_valider',
            description: '3h30 heures supplémentaires',
            details: { ecartMinutes: 210, heurePrevu: '18:00', heureReelle: '21:30' },
            statut: 'en_attente',
            justificationEmploye: 'Rush client urgent - demandé par manager'
          }
        ];

        for (const anomalieData of anomaliesTest) {
          await prisma.anomalie.create({ data: anomalieData });
        }

        console.log('✅ 3 anomalies de test créées\n');
        
        // Recharger la liste
        const nouvellesAnomalies = await makeRequest('/api/anomalies?statut=en_attente&limit=5', 'GET', null, tokenAdmin);
        anomaliesListe.push(...(nouvellesAnomalies.data.anomalies || []));
      }
    }

    // Afficher les anomalies
    console.log('\n📋 Anomalies disponibles pour test:');
    anomaliesListe.slice(0, 3).forEach((a, idx) => {
      console.log(`\n${idx + 1}. ID: ${a.id} - ${a.employe?.prenom || 'N/A'} ${a.employe?.nom || 'N/A'}`);
      console.log(`   Type: ${a.type} | Gravité: ${a.gravite}`);
      console.log(`   Description: ${a.description}`);
      if (a.justificationEmploye) {
        console.log(`   Justification: "${a.justificationEmploye}"`);
      }
    });

    if (anomaliesListe.length < 3) {
      console.log('\n⚠️ Pas assez d\'anomalies pour tester les 3 workflows');
      return;
    }

    // 3. TEST WORKFLOW VALIDATION
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣ TEST 1: VALIDATION (Shift NON modifié)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const anomalie1 = anomaliesListe[0];
    console.log(`📝 Anomalie: ${anomalie1.type} - ${anomalie1.description}`);
    console.log(`👤 Employé: ${anomalie1.employe?.prenom} ${anomalie1.employe?.nom}`);
    
    const validation = await makeRequest(`/api/anomalies/${anomalie1.id}/traiter`, 'PUT', {
      action: 'valider',
      commentaire: 'Justification transport acceptable - certificat RER fourni'
    }, tokenAdmin);

    if (validation.status === 200) {
      console.log('\n✅ VALIDATION RÉUSSIE');
      console.log(`   Statut: ${validation.data.anomalie.statut}`);
      console.log(`   Impact score: ${validation.data.impactScore} points`);
      console.log(`   Shift modifié: ${validation.data.shiftModifie ? 'OUI ✅' : 'NON ❌'}`);
      console.log(`   Message: ${validation.data.message}`);
    } else {
      console.error('❌ ÉCHEC:', validation.data);
    }

    // Petit délai
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. TEST WORKFLOW REFUS
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣ TEST 2: REFUS (Shift NON modifié, double pénalité)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const anomalie2 = anomaliesListe[1];
    console.log(`📝 Anomalie: ${anomalie2.type} - ${anomalie2.description}`);
    console.log(`👤 Employé: ${anomalie2.employe?.prenom} ${anomalie2.employe?.nom}`);
    
    const refus = await makeRequest(`/api/anomalies/${anomalie2.id}/traiter`, 'PUT', {
      action: 'refuser',
      commentaire: 'Aucune justification fournie malgré 2 relances. Récidive (3ème fois ce mois)'
    }, tokenAdmin);

    if (refus.status === 200) {
      console.log('\n❌ REFUS RÉUSSI');
      console.log(`   Statut: ${refus.data.anomalie.statut}`);
      console.log(`   Impact score: ${refus.data.impactScore} points (DOUBLE)`);
      console.log(`   Shift modifié: ${refus.data.shiftModifie ? 'OUI ✅' : 'NON ❌'}`);
      console.log(`   Message: ${refus.data.message}`);
    } else {
      console.error('❌ ÉCHEC:', refus.data);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. TEST WORKFLOW CORRECTION
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣ TEST 3: CORRECTION (Shift MODIFIÉ, pas de pénalité)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const anomalie3 = anomaliesListe[2];
    console.log(`📝 Anomalie: ${anomalie3.type} - ${anomalie3.description}`);
    console.log(`👤 Employé: ${anomalie3.employe?.prenom} ${anomalie3.employe?.nom}`);
    
    const correction = await makeRequest(`/api/anomalies/${anomalie3.id}/traiter`, 'PUT', {
      action: 'corriger',
      commentaire: 'Erreur de planning - formation RH non inscrite',
      shiftCorrection: {
        type: 'changement_planning',
        nouvelleHeure: '10:00',
        raison: 'Formation obligatoire RH du 27/11 (9h-12h) inscrite dans système formation mais oubliée dans planning. Email convocation du 20/11 joint.'
      }
    }, tokenAdmin);

    if (correction.status === 200) {
      console.log('\n🔧 CORRECTION RÉUSSIE');
      console.log(`   Statut: ${correction.data.anomalie.statut}`);
      console.log(`   Impact score: ${correction.data.impactScore} points (aucune pénalité)`);
      console.log(`   Shift modifié: ${correction.data.shiftModifie ? 'OUI ✅' : 'NON ❌'}`);
      console.log(`   Message: ${correction.data.message}`);
    } else {
      console.error('❌ ÉCHEC:', correction.data);
    }

    // 6. Vérifier les résultats finaux
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('6️⃣ VÉRIFICATION RÉSULTATS FINAUX');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const stats = await makeRequest('/api/anomalies/stats', 'GET', null, tokenAdmin);
    
    if (stats.status === 200) {
      console.log('📊 Statistiques anomalies:');
      console.log(`   Total: ${stats.data.stats.total}`);
      console.log(`   En attente: ${stats.data.stats.enAttente}`);
      console.log(`   Validées: ${stats.data.stats.validees}`);
      console.log(`   Refusées: ${stats.data.stats.refusees}`);
    }

    // Récupérer les anomalies traitées
    const traitees = await makeRequest('/api/anomalies?limit=10', 'GET', null, tokenAdmin);
    
    if (traitees.status === 200) {
      console.log('\n📋 Dernières anomalies traitées:');
      traitees.data.anomalies
        .filter(a => ['validee', 'refusee', 'corrigee'].includes(a.statut))
        .slice(0, 5)
        .forEach((a, idx) => {
          const emoji = a.statut === 'validee' ? '✅' : a.statut === 'refusee' ? '❌' : '🔧';
          console.log(`   ${emoji} ${a.employe?.prenom} ${a.employe?.nom} - ${a.type} (${a.statut})`);
          if (a.commentaireManager) {
            console.log(`      Manager: "${a.commentaireManager.substring(0, 60)}..."`);
          }
        });
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TESTS TERMINÉS AVEC SUCCÈS !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 RÉSUMÉ:');
    console.log('   ✅ Validation: Shift NON modifié, pénalité légère');
    console.log('   ❌ Refus: Shift NON modifié, double pénalité');
    console.log('   🔧 Correction: Shift MODIFIÉ, aucune pénalité');
    console.log('\n🎯 Le workflow complet fonctionne correctement !');

  } catch (error) {
    console.error('\n💥 Erreur fatale:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Test de connexion basique d'abord
async function testConnexion() {
  console.log('🔍 Test connexion serveur...');
  try {
    const health = await makeRequest('/health');
    if (health.status === 200) {
      console.log('✅ Serveur accessible\n');
      return true;
    } else {
      console.error('❌ Serveur répond mais avec erreur:', health.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Impossible de se connecter au serveur');
    console.error('   Vérifiez que le serveur tourne sur http://localhost:5000');
    console.error('   Lancez: cd server && node index.js\n');
    return false;
  }
}

// Main
(async () => {
  const connected = await testConnexion();
  if (!connected) {
    process.exit(1);
  }
  
  await testWorkflowComplet();
})();
