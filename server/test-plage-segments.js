/**
 * Test de comparaison sur une plage de dates avec l'algorithme de filtrage amélioré
 */
const comparisonController = require('./controllers/comparisonController');

async function testPlageComparaison() {
  // Simuler une requête HTTP avec les paramètres pour une semaine complète
  const req = {
    query: {
      employeId: '86',
      dateDebut: '2025-08-25',
      dateFin: '2025-08-31'
    }
  };

  // Simuler la réponse HTTP
  const res = {
    json: (data) => {
      console.log('✅ Résultat du test de plage:');
      
      console.log(`\n📅 Période: ${data.periode.debut} → ${data.periode.fin}`);
      console.log(`📊 Nombre de jours: ${data.comparaisons.length}`);
      
      let segmentNonPointeCount = 0;
      
      // Pour chaque jour, vérifier les anomalies
      data.comparaisons.forEach((jour, idx) => {
        const segments = jour.planifie.filter(s => s.type === 'présence').length;
        const pointages = jour.reel.filter(p => p.arrivee || p.depart).length;
        const anomalies = jour.ecarts.map(e => e.type);
        const segmentNonPointes = jour.ecarts.filter(e => e.type === 'segment_non_pointe');
        segmentNonPointeCount += segmentNonPointes.length;
        
        console.log(`\n${idx+1}. ${jour.date}: ${segments} segments, ${pointages} pointages`);
        console.log(`   Anomalies: ${anomalies.join(', ') || 'aucune'}`);
        
        // Afficher les détails si des segments non pointés sont détectés
        if (segmentNonPointes.length > 0) {
          console.log(`   🔍 Segments non pointés: ${segmentNonPointes.length}`);
          segmentNonPointes.forEach(e => {
            console.log(`     - ${e.description}`);
          });
        }
      });
      
      console.log(`\n📈 Synthèse: ${segmentNonPointeCount} segment(s) non pointé(s) sur ${data.comparaisons.length} jours`);
      
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

testPlageComparaison()
  .then(() => {
    console.log('\n🏁 Test terminé');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
