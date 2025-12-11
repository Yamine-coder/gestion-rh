// test-simulation-anomalies-complet.js
// Simulation complète du workflow des anomalies

const axios = require('axios');

const API_URL = 'http://localhost:5000';
let token = null;

// Connexion admin
async function login() {
  console.log(' Connexion en tant qu\'admin...\n');
  const response = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'admin@test.com',
    password: 'Admin123!'
  });
  token = response.data.token;
  console.log(' Connecté\n');
}

// Récupérer les anomalies en attente
async function getAnomaliesEnAttente() {
  console.log(' Récupération des anomalies en attente...\n');
  const response = await axios.get(`${API_URL}/api/anomalies?statut=en_attente&limit=20`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.anomalies;
}

// Afficher une anomalie
function afficherAnomalie(anomalie, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`ANOMALIE #${index + 1} - ID: ${anomalie.id}`);
  console.log(`${'='.repeat(80)}`);
  console.log(` Employé: ${anomalie.employe?.prenom} ${anomalie.employe?.nom}`);
  console.log(` Date: ${anomalie.date}`);
  console.log(` Type: ${anomalie.type.replace(/_/g, ' ').toUpperCase()}`);
  console.log(`  Gravité: ${anomalie.gravite.toUpperCase()}`);
  console.log(` Description: ${anomalie.description}`);
  if (anomalie.justificationEmploye) {
    console.log(` Justification employé: "${anomalie.justificationEmploye}"`);
  }
  console.log(`${'='.repeat(80)}\n`);
}

// Simuler le traitement
async function traiterAnomalie(anomalie, action, commentaire, shiftCorrection = null) {
  const emoji = action === 'valider' ? '' : action === 'refuser' ? '' : '';
  console.log(`${emoji} Traitement: ${action.toUpperCase()}...`);
  console.log(` Commentaire: "${commentaire}"`);
  
  const payload = { action, commentaire };
  if (action === 'corriger' && shiftCorrection) {
    payload.shiftCorrection = shiftCorrection;
    console.log(` Correction shift: ${shiftCorrection.type}`);
  }
  
  try {
    const response = await axios.put(
      `${API_URL}/api/anomalies/${anomalie.id}/traiter`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log(`\n RÉSULTAT:`);
    console.log(`    Statut: ${response.data.anomalie.statut}`);
    console.log(`    Shift modifié: ${response.data.shiftModifie ? 'OUI' : 'NON'}`);
    console.log(`    Message: ${response.data.message}`);
    console.log(`\n Traitement réussi!\n`);
    return response.data;
  } catch (error) {
    console.error(`\n ERREUR: ${error.response?.data?.error || error.message}\n`);
    return null;
  }
}

// Afficher les statistiques
async function afficherStatistiques(employeId) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(` STATISTIQUES EMPLOYÉ`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const response = await axios.get(
      `${API_URL}/api/anomalies?employeId=${employeId}&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const anomalies = response.data.anomalies;
    const validees = anomalies.filter(a => a.statut === 'validee').length;
    const refusees = anomalies.filter(a => a.statut === 'refusee').length;
    const corrigees = anomalies.filter(a => a.statut === 'corrigee').length;
    const enAttente = anomalies.filter(a => a.statut === 'en_attente').length;
    
    console.log(` Total anomalies: ${anomalies.length}`);
    console.log(`    Validées:     ${validees} (${Math.round(validees/anomalies.length*100)}%)`);
    console.log(`    Refusées:     ${refusees} (${Math.round(refusees/anomalies.length*100)}%)`);
    console.log(`    Corrigées:    ${corrigees} (${Math.round(corrigees/anomalies.length*100)}%)`);
    console.log(`    En attente:   ${enAttente}`);
    
    if (refusees >= 5) {
      console.log(`\n  ALERTE: ${refusees} anomalies refusées - Suivi RH recommandé!`);
    }
    
    console.log(`\n${'='.repeat(80)}\n`);
  } catch (error) {
    console.error(` Erreur statistiques: ${error.message}`);
  }
}

// Simulation principale
async function simulationComplete() {
  try {
    console.log('\n DÉBUT DE LA SIMULATION\n');
    
    await login();
    
    const anomalies = await getAnomaliesEnAttente();
    console.log(` ${anomalies.length} anomalies en attente trouvées\n`);
    
    if (anomalies.length === 0) {
      console.log('ℹ  Aucune anomalie à traiter. Créez des anomalies de test avec: node create-anomalies-test-front.js');
      return;
    }
    
    // Traiter les 3 premières anomalies avec différents scénarios
    const scenarios = [
      {
        action: 'valider',
        commentaire: 'Certificat médical fourni et vérifié. Arrêt maladie justifié.',
        desc: 'SCÉNARIO 1: VALIDATION (avec justificatif médical)'
      },
      {
        action: 'refuser',
        commentaire: 'Aucun justificatif fourni malgré 2 relances. Récidive 3ème fois ce mois.',
        desc: 'SCÉNARIO 2: REFUS (sans justificatif)'
      },
      {
        action: 'corriger',
        commentaire: 'Formation convoquée en urgence, non inscrite au planning.',
        shiftCorrection: {
          type: 'formation',
          nouvelleHeure: '09:00',
          raison: 'Email de convocation formation obligatoire du 28/11, envoyé par Direction RH le 27/11 à 15h30. Preuve: email réf #2024-FORM-156'
        },
        desc: 'SCÉNARIO 3: CORRECTION (erreur administrative)'
      }
    ];
    
    for (let i = 0; i < Math.min(3, anomalies.length); i++) {
      const anomalie = anomalies[i];
      const scenario = scenarios[i];
      
      console.log(`\n${''.repeat(80)}`);
      console.log(`  ${scenario.desc.padEnd(76)} `);
      console.log(`${''.repeat(80)}`);
      
      afficherAnomalie(anomalie, i);
      
      await traiterAnomalie(
        anomalie, 
        scenario.action, 
        scenario.commentaire, 
        scenario.shiftCorrection
      );
      
      // Attendre 1 seconde entre chaque traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Afficher les stats de l'employé du premier traitement
    if (anomalies.length > 0) {
      await afficherStatistiques(anomalies[0].employeId);
    }
    
    console.log('\n SIMULATION TERMINÉE AVEC SUCCÈS!\n');
    console.log(' Points clés du système:');
    console.log('     VALIDER = Justification OK, anomalie gardée en historique');
    console.log('     REFUSER = Pas de justif valable, alerte si récidive');
    console.log('     CORRIGER = Erreur admin, shift modifié, pas de pénalité');
    console.log('\n Consultez l\'historique complet dans l\'interface web\n');
    
  } catch (error) {
    console.error('\n ERREUR SIMULATION:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
  }
}

// Lancer la simulation
simulationComplete();
