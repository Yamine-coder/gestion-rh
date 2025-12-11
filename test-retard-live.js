/**
 * Script de test pour vérifier l'affichage des retards en live
 * Ce script crée un shift et des pointages avec retards pour tester
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000';
const TEST_EMPLOYE_ID = 56; // Léa Garcia
const TEST_DATE = '2025-11-29';

// Token d'authentification (vous devez être connecté en tant qu'admin)
// Pour obtenir un token: connectez-vous via l'interface et récupérez-le depuis localStorage
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

async function testRetards() {
  console.log('🧪 TEST DES RETARDS - VÉRIFICATION LIVE\n');
  console.log('=' .repeat(60));

  try {
    // 1. Créer un shift prévu
    console.log('\n📋 Étape 1: Création d\'un shift prévu');
    console.log(`   Employé: ${TEST_EMPLOYE_ID}, Date: ${TEST_DATE}`);
    console.log(`   Horaire prévu: 09:00 - 17:00`);
    
    const shiftData = {
      employeId: TEST_EMPLOYE_ID,
      date: TEST_DATE,
      type: 'présence',
      segments: [
        {
          start: '09:00',
          end: '17:00',
          commentaire: 'Test retard'
        }
      ]
    };

    // 2. Créer des pointages avec différents types de retards
    console.log('\n⏰ Étape 2: Création de pointages avec retards');
    
    // RETARD MODÉRÉ: 9:12 (12 min de retard, entre 5 et 20 min)
    console.log('\n   A) RETARD MODÉRÉ: Arrivée à 09:12 (12 min de retard)');
    const pointageRetardModere = {
      userId: TEST_EMPLOYE_ID,
      type: 'arrivee',
      horodatage: new Date(`${TEST_DATE}T09:12:00+01:00`).toISOString()
    };
    
    // Départ normal
    const pointageDepart = {
      userId: TEST_EMPLOYE_ID,
      type: 'depart',
      horodatage: new Date(`${TEST_DATE}T17:00:00+01:00`).toISOString()
    };

    // 3. Appeler l'API de comparaison
    console.log('\n🔍 Étape 3: Appel de l\'API de comparaison');
    console.log(`   GET /api/comparison/planning-vs-realite?employeId=${TEST_EMPLOYE_ID}&date=${TEST_DATE}`);
    
    const headers = AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {};
    
    const response = await axios.get(`${API_URL}/api/comparison/planning-vs-realite`, {
      params: {
        employeId: TEST_EMPLOYE_ID,
        date: TEST_DATE
      },
      headers
    });

    // 4. Analyser les résultats
    console.log('\n📊 Étape 4: Analyse des résultats\n');
    console.log('=' .repeat(60));
    
    if (response.data.success && response.data.comparaisons.length > 0) {
      const comparaison = response.data.comparaisons[0];
      
      console.log(`\n✅ Comparaison trouvée pour le ${comparaison.date}`);
      console.log(`   - Nombre d'écarts: ${comparaison.ecarts.length}`);
      
      if (comparaison.ecarts.length > 0) {
        console.log('\n📋 DÉTAIL DES ÉCARTS:\n');
        
        comparaison.ecarts.forEach((ecart, idx) => {
          console.log(`   ${idx + 1}. ${ecart.type.toUpperCase()}`);
          console.log(`      ├─ Gravité: ${ecart.gravite}`);
          console.log(`      ├─ Durée: ${ecart.dureeMinutes || 0} minutes`);
          console.log(`      ├─ Description: ${ecart.description}`);
          
          if (ecart.type.includes('retard')) {
            console.log(`      └─ ⚠️ RETARD DÉTECTÉ! ⚠️`);
          }
          console.log('');
        });
        
        // Vérifications spécifiques
        const retards = comparaison.ecarts.filter(e => e.type.includes('retard'));
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 RÉSULTAT DU TEST:\n');
        
        if (retards.length > 0) {
          console.log(`✅ SUCCÈS: ${retards.length} retard(s) détecté(s)`);
          retards.forEach(r => {
            console.log(`   - Type: ${r.type}`);
            console.log(`   - Durée: ${r.dureeMinutes} minutes`);
            console.log(`   - Gravité: ${r.gravite}`);
          });
          
          console.log('\n📱 VÉRIFICATION FRONTEND:');
          console.log('   1. Activez le mode comparaison dans l\'interface');
          console.log('   2. Cherchez l\'employé ID ' + TEST_EMPLOYE_ID + ' le ' + TEST_DATE);
          console.log('   3. Vous devriez voir un badge avec:');
          console.log('      - Icône: 🟡 (retard modéré) ou 🔴 (retard critique)');
          console.log('      - Label: "Retard modéré" ou "Retard critique"');
          console.log('      - Durée en minutes');
          
        } else {
          console.log('❌ ÉCHEC: Aucun retard détecté');
          console.log('   Les écarts détectés sont:');
          comparaison.ecarts.forEach(e => console.log(`   - ${e.type}`));
        }
        
      } else {
        console.log('⚠️ Aucun écart détecté');
      }
      
    } else {
      console.log('❌ Aucune comparaison trouvée');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n💡 CONSEILS DE DÉBOGAGE:');
    console.log('   1. Vérifiez les logs du serveur pour voir:');
    console.log('      - "🟡 RETARD MODÉRÉ DÉTECTÉ"');
    console.log('      - "🔴 RETARD CRITIQUE DÉTECTÉ"');
    console.log('      - "📤 ÉCART ARRIVÉE AJOUTÉ"');
    console.log('');
    console.log('   2. Vérifiez la console du navigateur pour voir:');
    console.log('      - "🔍 getEcartsForEmployeeDate appelé"');
    console.log('      - "✅ Config trouvée pour type"');
    console.log('      - "🎯 CellDrop - RETARDS DANS LA CELLULE"');
    console.log('');
    console.log('   3. Ouvrez les DevTools du navigateur (F12)');
    console.log('   4. Allez dans l\'onglet Console');
    console.log('   5. Activez le mode comparaison dans l\'interface');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    if (error.response) {
      console.error('   Statut:', error.response.status);
      console.error('   Détails:', error.response.data);
    }
  }
  
  console.log('\n🏁 Test terminé\n');
}

// Exécuter le test
testRetards();
