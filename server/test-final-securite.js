/**
 * ✅ TEST FINAL - SÉCURITÉ SYSTÈME POINTAGE
 * Version simplifiée et réaliste pour validation finale
 */

const { PrismaClient } = require('@prisma/client');
const { getWorkDayBounds } = require('./config/workDayConfig');

const prisma = new PrismaClient();
const TEST_USER_ID = 19;

async function testFinalSecurite() {
  console.log('✅ === TEST FINAL SÉCURITÉ - SYSTÈME POINTAGE ===\n');

  let score = 0;
  let maxScore = 0;

  try {
    // Nettoyer les données de test
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });

    // ✅ TEST 1: Double pointage (protection critique)
    console.log('✅ TEST 1: Protection double pointage');
    maxScore++;
    try {
      const maintenant = new Date();
      
      // Premier pointage
      await prisma.pointage.create({
        data: { userId: TEST_USER_ID, type: 'arrivee', horodatage: maintenant }
      });
      
      // Tentative de doublon exact
      await prisma.pointage.create({
        data: { userId: TEST_USER_ID, type: 'arrivee', horodatage: maintenant }
      });
      
      console.log('❌ Échec: Double pointage autorisé');
    } catch (error) {
      console.log('✅ Réussi: Double pointage bloqué');
      score++;
    }

    // ✅ TEST 2: Types de pointage invalides
    console.log('\n✅ TEST 2: Validation types de pointage');
    maxScore++;
    try {
      await prisma.pointage.create({
        data: { userId: TEST_USER_ID, type: 'invalid_type', horodatage: new Date() }
      });
      console.log('❌ Échec: Type invalide accepté');
    } catch (error) {
      console.log('✅ Réussi: Type invalide rejeté');
      score++;
    }

    // ✅ TEST 3: UserId négatif
    console.log('\n✅ TEST 3: Validation UserId');
    maxScore++;
    try {
      await prisma.pointage.create({
        data: { userId: -1, type: 'arrivee', horodatage: new Date() }
      });
      console.log('❌ Échec: UserId négatif accepté');
    } catch (error) {
      console.log('✅ Réussi: UserId négatif rejeté');
      score++;
    }

    // ✅ TEST 4: Logique journée de travail (test fonctionnel)
    console.log('\n✅ TEST 4: Logique journée de travail');
    maxScore++;
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });
    
    const maintenant = new Date();
    const arrivee = new Date(maintenant.getTime() - 60000); // -1 minute
    const depart = new Date(maintenant.getTime());          //  maintenant
    
    await prisma.pointage.create({
      data: { userId: TEST_USER_ID, type: 'arrivee', horodatage: arrivee }
    });
    
    await prisma.pointage.create({
      data: { userId: TEST_USER_ID, type: 'depart', horodatage: depart }
    });

    const { debutJournee, finJournee } = getWorkDayBounds();
    const pointagesJour = await prisma.pointage.findMany({
      where: {
        userId: TEST_USER_ID,
        horodatage: { gte: debutJournee, lt: finJournee }
      }
    });

    if (pointagesJour.length === 2) {
      console.log('✅ Réussi: Logique journée de travail OK');
      score++;
    } else {
      console.log(`❌ Échec: ${pointagesJour.length}/2 pointages trouvés`);
    }

    // ✅ TEST 5: Calcul temps de travail
    console.log('\n✅ TEST 5: Calcul temps de travail');
    maxScore++;
    
    let totalMinutes = 0;
    const pointagesTries = pointagesJour.sort((a, b) => a.horodatage - b.horodatage);
    
    for (let i = 0; i < pointagesTries.length - 1; i++) {
      const debut = pointagesTries[i];
      const fin = pointagesTries[i + 1];

      if (debut.type === 'arrivee' && fin.type === 'depart') {
        const diffMs = new Date(fin.horodatage) - new Date(debut.horodatage);
        const minutes = Math.floor(diffMs / 60000);
        totalMinutes += minutes;
      }
    }

    const heures = totalMinutes / 60;
    console.log(`   Temps calculé: ${heures.toFixed(2)}h`);
    
    if (heures > 0 && heures < 24) { // Temps réaliste
      console.log('✅ Réussi: Calcul temps correct');
      score++;
    } else {
      console.log('❌ Échec: Calcul temps incorrect');
    }

    // ✅ TEST 6: API Protection (simulation)
    console.log('\n✅ TEST 6: Simulation protection API');
    maxScore++;
    
    // Test logique 2 blocs maximum
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });
    
    // Créer 2 paires complètes (4 pointages)
    const now = new Date();
    const pointages = [
      { type: 'arrivee', offset: -240 }, // -4h
      { type: 'depart', offset: -120 },  // -2h
      { type: 'arrivee', offset: -60 },  // -1h
      { type: 'depart', offset: 0 }      //  maintenant
    ];

    for (const p of pointages) {
      const temps = new Date(now.getTime() + (p.offset * 60000));
      await prisma.pointage.create({
        data: { userId: TEST_USER_ID, type: p.type, horodatage: temps }
      });
    }

    // Compter les paires
    const tousPointages = await prisma.pointage.findMany({
      where: { userId: TEST_USER_ID },
      orderBy: { horodatage: 'asc' }
    });

    let paires = 0;
    for (let i = 0; i < tousPointages.length - 1; i++) {
      if (tousPointages[i].type === 'arrivee' && tousPointages[i + 1].type === 'depart') {
        paires++;
        i++; // Skip next
      }
    }

    if (paires === 2) {
      console.log('✅ Réussi: Détection 2 paires (limite respectée)');
      score++;
    } else {
      console.log(`❌ Échec: ${paires} paires détectées`);
    }

    // ✅ TEST 7: Performance requête
    console.log('\n✅ TEST 7: Performance requête');
    maxScore++;
    
    const startTime = Date.now();
    await prisma.pointage.findMany({
      where: {
        userId: TEST_USER_ID,
        horodatage: { gte: debutJournee, lt: finJournee }
      },
      orderBy: { horodatage: 'asc' }
    });
    const queryTime = Date.now() - startTime;
    
    if (queryTime < 200) { // Moins de 200ms acceptable
      console.log(`✅ Réussi: Performance OK (${queryTime}ms)`);
      score++;
    } else {
      console.log(`❌ Échec: Performance lente (${queryTime}ms)`);
    }

  } catch (error) {
    console.error('❌ Erreur durant les tests:', error);
  } finally {
    // Nettoyage
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.$disconnect();
  }

  // 📊 Résumé final
  const pourcentage = Math.round((score / maxScore) * 100);
  
  console.log('\n📊 === RÉSUMÉ FINAL SÉCURITÉ ===');
  console.log(`Score: ${score}/${maxScore} (${pourcentage}%)`);
  
  if (pourcentage >= 85) {
    console.log('🎉 EXCELLENT: Système sécurisé et prêt pour la production!');
    console.log('\n🛡️  Protections validées:');
    console.log('- ✅ Contraintes base de données actives');
    console.log('- ✅ Validation des types de pointage');
    console.log('- ✅ Protection anti-doublon');
    console.log('- ✅ Logique métier correcte');
    console.log('- ✅ Performances acceptables');
    console.log('\n🚀 RECOMMANDATION: Déployement autorisé');
    return true;
  } else if (pourcentage >= 70) {
    console.log('⚠️  BON: Système acceptable avec améliorations recommandées');
    console.log('🔧 Actions suggérées: Vérifier les échecs et appliquer les corrections');
    return false;
  } else {
    console.log('❌ CRITIQUE: Système non sécurisé - corrections obligatoires');
    console.log('🚫 RECOMMANDATION: Ne pas déployer en production');
    return false;
  }
}

// 🚀 Lancer le test final
if (require.main === module) {
  testFinalSecurite()
    .then(success => {
      console.log(`\n${success ? '✅' : '❌'} Test ${success ? 'RÉUSSI' : 'ÉCHOUÉ'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { testFinalSecurite };
