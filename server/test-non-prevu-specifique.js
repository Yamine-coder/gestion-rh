/**
 * Test spécifique pour le problème "Non prévu" malgré un pointage et un shift existant
 */
const prisma = require('./prisma/client');
const comparisonController = require('./controllers/comparisonController');

async function testNonPrevuBug() {
  // Simuler une requête HTTP pour le jour concerné (visible dans l'image)
  const req = {
    query: {
      employeId: '86',
      date: '2025-08-27' // Date de l'image, à ajuster si nécessaire
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
          console.log(`  ${idx + 1}. ${segment.debut} - ${segment.fin} (shiftId: ${segment.shiftId})`);
        } else {
          console.log(`  ${idx + 1}. ${segment.type} (${segment.motif || 'sans motif'})`);
        }
      });
      
      console.log('\n⏰ Pointages réels:');
      jour.reel.forEach((pointage, idx) => {
        console.log(`  ${idx + 1}. ${pointage.arrivee || '?'} - ${pointage.depart || '?'}`);
      });

      console.log('\n📊 Anomalies détectées:');
      jour.ecarts.forEach(ecart => {
        console.log(`  • ${ecart.type}: ${ecart.description}`);
      });
      
      // Vérifier présence des anomalies problématiques
      const nonPrevus = jour.ecarts.filter(e => e.type === 'presence_non_prevue');
      if (nonPrevus.length > 0) {
        console.log('\n🔍 PROBLÈME: Anomalies "presence_non_prevue" détectées malgré des shifts planifiés:');
        nonPrevus.forEach(e => {
          console.log(`   - ${e.description}`);
        });
        
        // Débug: vérification des assignations
        console.log('\n🔧 DIAGNOSTIC:');
        const segmentsValides = jour.planifie.filter(s => s.debut && s.fin);
        const pointagesComplets = jour.reel.filter(p => p.arrivee && p.depart);
        console.log(`   • ${segmentsValides.length} segments valides vs ${pointagesComplets.length} pointages complets`);
        
        // Afficher le résultat brut pour inspection
        console.log('\n🧾 DONNÉES BRUTES pour inspection:');
        console.log(JSON.stringify(jour, null, 2));
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
    console.log('⚙️ Exécution du test avec employeId=86 et date=2025-08-27...');
    await comparisonController.getPlanningVsRealite(req, res);
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testNonPrevuBug()
  .then(() => {
    console.log('\n🏁 Test terminé');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
