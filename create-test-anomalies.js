// Script pour créer des anomalies de test variées
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
    if (body) options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));

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

async function createAnomalies() {
  console.log('\n🎯 Création d\'anomalies de test variées\n');
  console.log('='.repeat(60));

  // Connexion
  console.log('\n1️⃣  Connexion...');
  const credentials = [
    { email: 'marie.leroy@example.com', password: 'password123' },
    { email: 'admin@gestionrh.com', password: 'admin123' },
    { email: 'thomas.laurent@restaurant.com', password: 'password123' }
  ];

  let token = null;
  for (const cred of credentials) {
    const login = await makeRequest('/auth/login', 'POST', cred);
    if (login.ok) {
      token = login.data.token;
      console.log(`   ✓ Connecté avec ${cred.email}`);
      break;
    }
  }

  if (!token) {
    console.log('   ✗ Échec de connexion');
    return;
  }

  // Employés disponibles
  const employes = [
    { id: 53, nom: 'Thomas Laurent' },
    { id: 54, nom: 'Emma Simon' },
    { id: 55, nom: 'Lucas Michel' },
    { id: 56, nom: 'Léa Garcia' },
    { id: 57, nom: 'Hugo David' },
    { id: 58, nom: 'Camille Richard' }
  ];

  // Scénarios d'anomalies variés
  const scenarios = [
    // Retards
    {
      type: 'retard_simple',
      gravite: 'info',
      description: 'Retard léger de 5 minutes',
      heurePrevue: '09:00',
      heureReelle: '09:05',
      ecartMinutes: 5,
      dureeMinutes: 5
    },
    {
      type: 'retard_modere',
      gravite: 'attention',
      description: 'Retard de 18 minutes',
      heurePrevue: '09:00',
      heureReelle: '09:18',
      ecartMinutes: 18,
      dureeMinutes: 18
    },
    {
      type: 'retard_critique',
      gravite: 'critique',
      description: 'Retard important de 52 minutes',
      heurePrevue: '08:00',
      heureReelle: '08:52',
      ecartMinutes: 52,
      dureeMinutes: 52
    },
    
    // Départs anticipés
    {
      type: 'depart_anticipe',
      gravite: 'attention',
      description: 'Départ 25 minutes plus tôt',
      heurePrevue: '17:00',
      heureReelle: '16:35',
      ecartMinutes: 25,
      dureeMinutes: 25
    },
    {
      type: 'depart_premature_critique',
      gravite: 'critique',
      description: 'Départ prématuré de 2h',
      heurePrevue: '18:00',
      heureReelle: '16:00',
      ecartMinutes: 120,
      dureeMinutes: 120
    },
    
    // Heures supplémentaires
    {
      type: 'heures_sup_auto_validees',
      gravite: 'ok',
      description: 'Heures supplémentaires 45min (auto-validées)',
      heurePrevue: '17:00',
      heureReelle: '17:45',
      ecartMinutes: 45,
      dureeMinutes: 45
    },
    {
      type: 'heures_sup_a_valider',
      gravite: 'a_valider',
      description: 'Heures supplémentaires 3h (à valider)',
      heurePrevue: '17:00',
      heureReelle: '20:00',
      ecartMinutes: 180,
      dureeMinutes: 180
    },
    
    // Hors plage
    {
      type: 'hors_plage_in',
      gravite: 'hors_plage',
      description: 'Arrivée hors plage horaire (5h30)',
      heurePrevue: '08:00',
      heureReelle: '05:30',
      ecartMinutes: 150,
      dureeMinutes: 150
    },
    {
      type: 'hors_plage_out',
      gravite: 'hors_plage',
      description: 'Départ hors plage horaire (23h30)',
      heurePrevue: '22:00',
      heureReelle: '23:30',
      ecartMinutes: 90,
      dureeMinutes: 90
    },
    
    // Pointages incomplets
    {
      type: 'missing_in',
      gravite: 'attention',
      description: 'Pointage d\'arrivée manquant',
      heurePrevue: '09:00',
      heureReelle: null,
      ecartMinutes: 0,
      dureeMinutes: 0
    },
    {
      type: 'missing_out',
      gravite: 'attention',
      description: 'Pointage de départ manquant',
      heurePrevue: '17:00',
      heureReelle: null,
      ecartMinutes: 0,
      dureeMinutes: 0
    },
    
    // Présence non prévue
    {
      type: 'presence_non_prevue',
      gravite: 'attention',
      description: 'Pointage sans shift prévu',
      heurePrevue: null,
      heureReelle: '10:30',
      ecartMinutes: 0,
      dureeMinutes: 0
    }
  ];

  console.log('\n2️⃣  Création des anomalies...\n');

  // Dates pour les anomalies (aujourd'hui + prochains jours)
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  let created = 0;
  let failed = 0;

  // Créer des anomalies pour différents employés et dates
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const employe = employes[i % employes.length];
    const date = dates[i % dates.length];

    const result = await makeRequest('/api/anomalies/sync-from-comparison', 'POST', {
      employeId: employe.id,
      date: date,
      ecarts: [scenario]
    }, token);

    if (result.ok) {
      created += result.data.anomaliesCreees || 0;
      const emoji = scenario.gravite === 'critique' ? '🔴' : 
                    scenario.gravite === 'attention' ? '🟡' :
                    scenario.gravite === 'hors_plage' ? '🟣' :
                    scenario.gravite === 'a_valider' ? '🟠' : '🔵';
      console.log(`   ${emoji} ${employe.nom} - ${scenario.type}`);
      console.log(`      ${scenario.description} (${date})`);
    } else {
      failed++;
      console.log(`   ✗ Échec: ${employe.nom} - ${scenario.type}`);
      if (result.data?.error) {
        console.log(`      Erreur: ${result.data.error}`);
      }
    }
  }

  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Création terminée !`);
  console.log(`   ${created} anomalie(s) créée(s)`);
  if (failed > 0) {
    console.log(`   ${failed} échec(s)`);
  }

  // Vérification
  console.log('\n3️⃣  Vérification des anomalies créées...');
  const anomalies = await makeRequest('/api/anomalies?statut=en_attente', 'GET', null, token);
  
  if (anomalies.ok) {
    const enAttente = anomalies.data.anomalies?.length || 0;
    console.log(`   ✓ ${enAttente} anomalie(s) en attente trouvée(s)`);
    
    // Afficher quelques exemples
    if (anomalies.data.anomalies && anomalies.data.anomalies.length > 0) {
      console.log('\n📋 Exemples d\'anomalies créées:');
      anomalies.data.anomalies.slice(0, 5).forEach((a, idx) => {
        const emoji = a.gravite === 'critique' ? '🔴' : 
                      a.gravite === 'attention' ? '🟡' :
                      a.gravite === 'hors_plage' ? '🟣' :
                      a.gravite === 'a_valider' ? '🟠' : '🔵';
        console.log(`   ${idx + 1}. ${emoji} ${a.type} - ${a.description?.substring(0, 40)}...`);
      });
    }
  }

  console.log('\n💡 Allez dans le planning web et activez "Mode Comparaison"');
  console.log('   pour voir les badges d\'anomalies !\n');
}

createAnomalies().catch(err => {
  console.error('\n❌ Erreur:', err.message);
  process.exit(1);
});
