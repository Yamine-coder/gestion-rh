/**
 * Test spécifique pour le scénario des segments redondants causant des "Non prévu" indésirables
 */
const prisma = require('./prisma/client');
const comparisonController = require('./controllers/comparisonController');

async function testSegmentsRedondants() {
  // Simuler une requête HTTP avec les paramètres qui causent l'anomalie
  const req = {
    query: {
      employeId: '86',
      dateDebut: '2025-08-27',
      dateFin: '2025-08-27'
    }
  };

  // Simuler la réponse HTTP
  const res = {
    json: (data) => {
      console.log('✅ Résultat du test:');
      
      // Afficher les créneaux pour la journée testée
      const jour = data.comparaisons[0];
      console.log(`\n📅 Jour testé: ${jour.date}`);
      
      console.log('\n📋 Segments planifiés:');
      jour.planifie.forEach((segment, idx) => {
        if (segment.type === 'présence') {
          console.log(`  ${idx + 1}. ${segment.debut} - ${segment.fin}`);
        } else {
          console.log(`  ${idx + 1}. ${segment.type} (${segment.motif || 'sans motif'})`);
        }
      });
      
      console.log('\n📊 Anomalies détectées:');
      jour.ecarts.forEach(ecart => {
        console.log(`  • ${ecart.type}: ${ecart.description}`);
      });
      
      // Vérifier si l'anomalie non_prevu est présente de manière incorrecte
      const segmentNonPointes = jour.ecarts.filter(e => e.type === 'segment_non_pointe');
      
      if (segmentNonPointes.length > 0) {
        console.log('\n🔍 ATTENTION: Des segments non pointés ont été détectés:');
        segmentNonPointes.forEach(e => {
          console.log(`   - ${e.description}`);
        });
      } else {
        console.log('\n✅ Aucun segment non pointé incorrect détecté');
      }
      
      return data;
    },
    status: (code) => ({
      json: (data) => {
        console.log(`❌ Erreur ${code}:`, data);
        return data;
      }
    })
  };

  // Exécuter le contrôleur
  try {
    await comparisonController.getPlanningVsRealite(req, res);
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testSegmentsRedondants()
  .then(() => {
    console.log('\n🏁 Test terminé');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
