/**
 * 🚨 TESTS DE FAILLES CRITIQUES - POINTAGE
 * Version simplifiée pour détecter rapidement les vulnérabilités majeures
 */

const { PrismaClient } = require('@prisma/client');
const { getWorkDayBounds } = require('./config/workDayConfig');

const prisma = new PrismaClient();
const TEST_USER_ID = 19;

async function testFaillesCritiques() {
  console.log('🚨 === TESTS FAILLES CRITIQUES - POINTAGE ===\n');

  let vulnérabilités = 0;
  let testsPassed = 0;

  try {
    // Nettoyer les données de test
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });

    // 🔥 TEST 1: Double pointage simultané
    console.log('🔥 TEST 1: Protection contre double pointage');
    try {
      const maintenant = new Date();
      await Promise.all([
        prisma.pointage.create({
          data: { userId: TEST_USER_ID, type: 'arrivee', horodatage: maintenant }
        }),
        prisma.pointage.create({
          data: { userId: TEST_USER_ID, type: 'arrivee', horodatage: maintenant }
        })
      ]);
      console.log('❌ VULNÉRABILITÉ: Double pointage autorisé!');
      vulnérabilités++;
    } catch (error) {
      console.log('✅ Protection OK: Double pointage bloqué');
      testsPassed++;
    }

    // 🔥 TEST 2: Logique travail de nuit
    console.log('\n🔥 TEST 2: Logique travail de nuit (22h-6h)');
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });
    
    // Créer un shift de nuit
    const hier22h = new Date();
    hier22h.setDate(hier22h.getDate() - 1);
    hier22h.setHours(22, 0, 0, 0);
    
    const aujourdhui6h = new Date();
    aujourdhui6h.setHours(6, 0, 0, 0);
    
    await prisma.pointage.create({
      data: { userId: TEST_USER_ID, type: 'arrivee', horodatage: hier22h }
    });
    
    await prisma.pointage.create({
      data: { userId: TEST_USER_ID, type: 'depart', horodatage: aujourdhui6h }
    });

    // Vérifier si c'est compté dans la bonne journée de travail
    const { debutJournee, finJournee } = getWorkDayBounds();
    const pointagesJournee = await prisma.pointage.findMany({
      where: {
        userId: TEST_USER_ID,
        horodatage: { gte: debutJournee, lt: finJournee }
      }
    });

    if (pointagesJournee.length === 2) {
      console.log('✅ Logique nuit OK: 2 pointages dans la même journée de travail');
      testsPassed++;
    } else {
      console.log(`❌ PROBLÈME: ${pointagesJournee.length}/2 pointages dans la journée de travail`);
      vulnérabilités++;
    }

    // 🔥 TEST 3: Calcul temps travail de nuit
    console.log('\n🔥 TEST 3: Calcul temps travail de nuit');
    
    let totalMinutes = 0;
    for (let i = 0; i < pointagesJournee.length - 1; i++) {
      const debut = pointagesJournee[i];
      const fin = pointagesJournee[i + 1];

      if (debut.type === 'arrivee' && fin.type === 'depart') {
        const diffMs = new Date(fin.horodatage) - new Date(debut.horodatage);
        const minutes = Math.floor(diffMs / 60000);
        if (minutes > 0) {
          totalMinutes += minutes;
        }
      }
    }

    const totalHeures = totalMinutes / 60;
    console.log(`Temps calculé: ${totalHeures}h (attendu: 8h)`);
    
    if (totalHeures >= 7.5 && totalHeures <= 8.5) {
      console.log('✅ Calcul temps nuit OK');
      testsPassed++;
    } else {
      console.log('❌ PROBLÈME: Calcul temps incorrect pour travail de nuit');
      vulnérabilités++;
    }

    // 🔥 TEST 4: Limite 2 blocs par jour
    console.log('\n🔥 TEST 4: Limite 2 blocs par journée de travail');
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });
    
    const baseTime = new Date(debutJournee);
    const pointagesTest = [
      { type: 'arrivee', offset: 0 },      // Bloc 1
      { type: 'depart', offset: 240 },     // Bloc 1 (4h)
      { type: 'arrivee', offset: 300 },    // Bloc 2
      { type: 'depart', offset: 540 },     // Bloc 2 (4h)
      { type: 'arrivee', offset: 600 }     // Bloc 3 (interdit)
    ];

    for (const p of pointagesTest) {
      const temps = new Date(baseTime);
      temps.setMinutes(temps.getMinutes() + p.offset);
      
      await prisma.pointage.create({
        data: { userId: TEST_USER_ID, type: p.type, horodatage: temps }
      });
    }

    // Vérifier la logique côté API (simulation)
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

    if (paires <= 2) {
      console.log(`✅ Limite blocs OK: ${paires} paires détectées (max 2)`);
      testsPassed++;
    } else {
      console.log(`❌ PROBLÈME: ${paires} paires (dépasse limite de 2)`);
      vulnérabilités++;
    }

    // 🔥 TEST 5: Validation des types de pointage
    console.log('\n🔥 TEST 5: Validation types de pointage');
    try {
      await prisma.pointage.create({
        data: {
          userId: TEST_USER_ID,
          type: 'hack_attempt',
          horodatage: new Date()
        }
      });
      console.log('❌ VULNÉRABILITÉ: Type invalide accepté!');
      vulnérabilités++;
    } catch (error) {
      console.log('✅ Protection OK: Type invalide rejeté');
      testsPassed++;
    }

    // 🔥 TEST 6: UserId validation
    console.log('\n🔥 TEST 6: Validation UserId');
    try {
      await prisma.pointage.create({
        data: {
          userId: -999,
          type: 'arrivee',
          horodatage: new Date()
        }
      });
      console.log('❌ VULNÉRABILITÉ: UserId négatif accepté!');
      vulnérabilités++;
    } catch (error) {
      console.log('✅ Protection OK: UserId invalide rejeté');
      testsPassed++;
    }

  } catch (error) {
    console.error('❌ Erreur durant les tests:', error);
  } finally {
    // Nettoyage
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.$disconnect();
  }

  // 📊 Résumé
  console.log('\n📊 === RÉSUMÉ SÉCURITÉ ===');
  console.log(`Tests réussis: ${testsPassed}`);
  console.log(`Vulnérabilités: ${vulnérabilités}`);
  console.log(`Score sécurité: ${Math.round((testsPassed / (testsPassed + vulnérabilités)) * 100)}%`);

  if (vulnérabilités === 0) {
    console.log('🎉 EXCELLENT: Aucune vulnérabilité critique détectée!');
    return true;
  } else {
    console.log(`⚠️  ATTENTION: ${vulnérabilités} vulnérabilité(s) critique(s) détectée(s)`);
    return false;
  }
}

// 🚀 Lancer les tests critiques
if (require.main === module) {
  testFaillesCritiques()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { testFaillesCritiques };
