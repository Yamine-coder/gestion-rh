/**
 * Test spécifique pour le problème "Non prévu" malgré un pointage et un shift existant
 * Test pour le jour 2025-08-28 où le problème se produit
 */
const prisma = require('./prisma/client');
const comparisonController = require('./controllers/comparisonController');
const { getParisDateString, getParisTimeString } = require('./utils/parisTimeUtils');

async function testNonPrevuBug() {
  try {
    // Date de test spécifique où le problème se produit
    const dateTest = '2025-08-28';
    
    // Récupérer les shifts directement
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: 86,
        date: {
          gte: new Date('2025-08-27T19:00:00.000Z'),
          lt: new Date('2025-08-29T19:00:00.000Z')
        }
      },
      include: {
        employe: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
    
    console.log(`🔍 Fenêtre SQL avec cutoff 5h: 2025-08-27T19:00:00.000Z → (lt) 2025-08-29T19:00:00.000Z | Jours demandés: [ '${dateTest}' ]`);
    console.log(`📋 Shifts prévus: ${shifts.length}, Pointages réels: 4`);
    
    // Debug: Afficher les shifts avant filtrage
    console.log("\n🔍 Shifts trouvés avant filtrage par jour:");
    shifts.forEach((s, i) => {
      console.log(`  Shift ${i+1}: date=${s.date}, type=${s.type}`);
      console.log(`    Segments:`, s.segments);
      
      // Vérifier le format de date pour diagnostic
      const dateStr = getParisDateString(new Date(s.date));
      console.log(`    Format de date: ${dateStr} (comparé à ${dateTest})`);
    });
    
    // Simuler le filtrage par jour (partie du contrôleur qui a le problème)
    const shiftsJour = shifts.filter(s => {
      const shiftDate = getParisDateString(new Date(s.date));
      return shiftDate === dateTest;
    });
    
    console.log(`\n🧮 Shifts filtrés pour le jour ${dateTest}: ${shiftsJour.length}`);
    console.log(`🧹 ShiftsJour après filtrage:`, JSON.stringify(shiftsJour, null, 2));
    
    // Simuler une requête HTTP
    const req = {
      query: {
        employeId: '86',
        date: dateTest
      }
    };
    
    // Simuler la réponse HTTP
    const res = {
      json: (data) => {
        console.log('\n✅ Résultat du test pour la journée spécifique:');
        
        // Trouver la comparaison pour ce jour
        const jour = data.comparaisons ? 
          data.comparaisons.find(c => c.date === dateTest) : 
          (data.success ? data.comparaison : null);
        
        if (!jour) {
          console.log(`❌ Aucune comparaison trouvée pour le jour ${dateTest}`);
          return data;
        }
        
        console.log(`\n📋 Informations récupérées:`);
        console.log(`Shift du jour: ${JSON.stringify(shiftsJour, null, 2)}`);
        console.log(`\nPointages du jour (après déduplication): ${JSON.stringify(jour.reel, null, 2)}`);
        console.log(`\nRésultat de la comparaison: ${JSON.stringify({ success: data.success, comparaison: jour }, null, 2)}`);
        
        console.log(`\n📊 Détail des écarts:`);
        console.log(jour.ecarts);
        
        // Vérifier présence des anomalies problématiques
        const nonPrevus = jour.ecarts.filter(e => e.type === 'presence_non_prevue');
        if (nonPrevus.length > 0) {
          console.log('\n⚠️ PROBLÈME DÉTECTÉ: "Non prévu" malgré un shift existant');
          console.log(`Analyse:`);
          console.log(`- Il y a un shift avec segment ${shiftsJour[0]?.segments?.[0]?.debut || '?'}-${shiftsJour[0]?.segments?.[0]?.fin || '?'}`);
          console.log(`- Il y a un pointage avec arrivée ${jour.reel?.[0]?.arrivee || '?'} et départ ${jour.reel?.[0]?.depart || '?'}`);
          console.log(`- La comparaison affiche "${nonPrevus[0].description}"`);
        } 
        else if (shiftsJour.length > 0 && jour.ecarts?.some(e => e.type === 'hors_plage_in' || e.type === 'depart_premature_critique')) {
          console.log(`\n✅ Les écarts sont correctement détectés avec le shift existant:`);
          jour.ecarts.forEach(e => {
            console.log(`- ${e.description}`);
          });
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
    await comparisonController.getPlanningVsRealite(req, res);
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNonPrevuBug()
  .then(() => {
    console.log('\n🏁 Test terminé');
  })
  .catch((err) => {
    console.error('❌ Erreur fatale:', err);
  });
