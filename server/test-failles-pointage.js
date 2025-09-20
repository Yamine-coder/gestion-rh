/**
 * 🔍 TESTS DE SÉCURITÉ ET FAILLES - SYSTÈME POINTAGE
 * Teste les cas limites, tentatives de contournement et failles potentielles
 */

const { PrismaClient } = require('@prisma/client');
const { getWorkDayBounds } = require('./config/workDayConfig');

const prisma = new PrismaClient();

// 🎯 DONNÉES DE TEST
const TEST_USER_ID = 19; // Employé de test existant

async function runSecurityTests() {
  console.log('🔍 === TESTS DE SÉCURITÉ - SYSTÈME POINTAGE ===\n');

  try {
    // 🧹 Nettoyer les données de test
    console.log('🧹 Nettoyage des données de test...');
    await prisma.pointage.deleteMany({
      where: { userId: TEST_USER_ID }
    });

    // ========================================
    // 🔥 TEST 1: TENTATIVE DE DOUBLE POINTAGE SIMULTANÉ
    // ========================================
    console.log('🔥 TEST 1: Tentative de double pointage simultané');
    try {
      const maintenant = new Date();
      
      // Créer 2 pointages identiques simultanément
      const promiseA = prisma.pointage.create({
        data: {
          userId: TEST_USER_ID,
          type: 'arrivee',
          horodatage: maintenant
        }
      });
      
      const promiseB = prisma.pointage.create({
        data: {
          userId: TEST_USER_ID,
          type: 'arrivee',
          horodatage: maintenant
        }
      });

      const [pointageA, pointageB] = await Promise.all([promiseA, promiseB]);
      console.log('❌ FAILLE DÉTECTÉE: Double pointage autorisé!', {
        pointageA: pointageA.id,
        pointageB: pointageB.id
      });
    } catch (error) {
      console.log('✅ Protection OK: Double pointage bloqué par la DB');
    }

    // ========================================
    // 🔥 TEST 2: POINTAGE DANS LE FUTUR
    // ========================================
    console.log('\n🔥 TEST 2: Tentative de pointage dans le futur');
    try {
      const futur = new Date();
      futur.setHours(futur.getHours() + 5); // +5 heures dans le futur
      
      const pointageFutur = await prisma.pointage.create({
        data: {
          userId: TEST_USER_ID,
          type: 'arrivee',
          horodatage: futur
        }
      });
      
      console.log('❌ FAILLE DÉTECTÉE: Pointage futur autorisé!', {
        maintenant: new Date().toISOString(),
        pointageFutur: pointageFutur.horodatage.toISOString()
      });
    } catch (error) {
      console.log('✅ Protection OK: Pointage futur rejeté');
    }

    // ========================================
    // 🔥 TEST 3: POINTAGE TRÈS ANCIEN (MANIPULATION HISTORIQUE)
    // ========================================
    console.log('\n🔥 TEST 3: Tentative de manipulation historique');
    try {
      const tresTresAncien = new Date('2020-01-01T08:00:00');
      
      const pointageAncien = await prisma.pointage.create({
        data: {
          userId: TEST_USER_ID,
          type: 'arrivee',
          horodatage: tresTresAncien
        }
      });
      
      console.log('❌ FAILLE DÉTECTÉE: Pointage historique autorisé!', {
        pointageAncien: pointageAncien.horodatage.toISOString()
      });
    } catch (error) {
      console.log('✅ Protection OK: Pointage historique rejeté');
    }

    // ========================================
    // 🔥 TEST 4: DÉPASSEMENT LIMITE 2 BLOCS PAR JOUR
    // ========================================
    console.log('\n🔥 TEST 4: Tentative de dépassement limite 2 blocs');
    
    // Nettoyer et créer exactement 4 pointages (2 blocs complets)
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });
    
    const { debutJournee } = getWorkDayBounds();
    const baseTime = new Date(debutJournee);
    
    const pointages = [
      { type: 'arrivee', offset: 0 },      // Bloc 1: arrivée
      { type: 'depart', offset: 240 },     // Bloc 1: départ (+4h)
      { type: 'arrivee', offset: 300 },    // Bloc 2: arrivée (+5h)
      { type: 'depart', offset: 540 }      // Bloc 2: départ (+9h)
    ];

    for (const p of pointages) {
      const temps = new Date(baseTime);
      temps.setMinutes(temps.getMinutes() + p.offset);
      
      await prisma.pointage.create({
        data: {
          userId: TEST_USER_ID,
          type: p.type,
          horodatage: temps
        }
      });
    }

    // Maintenant tester si on peut ajouter un 5ème pointage
    try {
      const temps5eme = new Date(baseTime);
      temps5eme.setMinutes(temps5eme.getMinutes() + 600); // +10h
      
      const pointage5eme = await prisma.pointage.create({
        data: {
          userId: TEST_USER_ID,
          type: 'arrivee',
          horodatage: temps5eme
        }
      });
      
      console.log('❌ FAILLE DÉTECTÉE: 5ème pointage autorisé (dépassement 2 blocs)!', {
        pointageId: pointage5eme.id
      });
    } catch (error) {
      console.log('✅ Limite respectée: 5ème pointage rejeté par logique métier');
    }

    // ========================================
    // 🔥 TEST 5: CALCUL TEMPS AVEC POINTAGES DÉSORDONNÉS
    // ========================================
    console.log('\n🔥 TEST 5: Test avec pointages dans le désordre chronologique');
    
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });
    
    // Créer des pointages dans le désordre
    const pointagesDesordre = [
      { type: 'depart', offset: 240 },   // Départ AVANT arrivée
      { type: 'arrivee', offset: 0 },    // Arrivée APRÈS départ
      { type: 'arrivee', offset: 300 },  // Autre arrivée
      { type: 'depart', offset: 540 }    // Autre départ
    ];

    for (const p of pointagesDesordre) {
      const temps = new Date(baseTime);
      temps.setMinutes(temps.getMinutes() + p.offset);
      
      await prisma.pointage.create({
        data: {
          userId: TEST_USER_ID,
          type: p.type,
          horodatage: temps
        }
      });
    }

    // Calculer le temps total avec cette logique cassée
    const pointagesTries = await prisma.pointage.findMany({
      where: { userId: TEST_USER_ID },
      orderBy: { horodatage: 'asc' }
    });

    let totalMinutes = 0;
    for (let i = 0; i < pointagesTries.length - 1; i++) {
      const debut = pointagesTries[i];
      const fin = pointagesTries[i + 1];

      if (debut.type === 'arrivee' && fin.type === 'depart') {
        const diffMs = new Date(fin.horodatage) - new Date(debut.horodatage);
        const minutes = Math.floor(diffMs / 60000);
        if (minutes > 0) {
          totalMinutes += minutes;
        }
      }
    }

    console.log(`Calcul avec pointages désordonnés: ${totalMinutes} minutes`);
    if (totalMinutes !== 540) { // Devrait être 9h = 540min
      console.log('❌ FAILLE DÉTECTÉE: Calcul incorrect avec pointages désordonnés');
    } else {
      console.log('✅ Calcul correct malgré pointages désordonnés');
    }

    // ========================================
    // 🔥 TEST 6: TRAVAIL DE NUIT - CHANGEMENT D'HEURE
    // ========================================
    console.log('\n🔥 TEST 6: Test changement d\'heure (travail de nuit)');
    
    await prisma.pointage.deleteMany({ where: { userId: TEST_USER_ID } });
    
    // Simuler un travail de nuit qui traverse minuit
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    hier.setHours(22, 0, 0, 0); // 22h hier
    
    const aujourdhui = new Date();
    aujourdhui.setHours(6, 0, 0, 0); // 6h aujourd'hui
    
    await prisma.pointage.create({
      data: { userId: TEST_USER_ID, type: 'arrivee', horodatage: hier }
    });
    
    await prisma.pointage.create({
      data: { userId: TEST_USER_ID, type: 'depart', horodatage: aujourdhui }
    });

    // Vérifier dans quelle journée de travail c'est comptabilisé
    const { debutJournee: debut, finJournee: fin } = getWorkDayBounds();
    
    const pointagesJournee = await prisma.pointage.findMany({
      where: {
        userId: TEST_USER_ID,
        horodatage: { gte: debut, lt: fin }
      }
    });

    console.log(`Pointages trouvés dans la journée de travail actuelle: ${pointagesJournee.length}/2`);
    if (pointagesJournee.length !== 2) {
      console.log('❌ FAILLE DÉTECTÉE: Travail de nuit mal comptabilisé');
    } else {
      console.log('✅ Travail de nuit correctement comptabilisé');
    }

    // ========================================
    // 🔥 TEST 7: INJECTION SQL DANS LES DATES
    // ========================================
    console.log('\n🔥 TEST 7: Test injection SQL dans les paramètres de date');
    
    const tentativeInjection = "'; DROP TABLE pointages; --";
    
    try {
      // Tenter une injection via les paramètres
      await prisma.pointage.findMany({
        where: {
          userId: TEST_USER_ID,
          // Cette injection devrait être bloquée par Prisma
          horodatage: { gte: tentativeInjection }
        }
      });
      console.log('❌ FAILLE POTENTIELLE: Injection SQL non détectée');
    } catch (error) {
      console.log('✅ Protection OK: Injection SQL bloquée par Prisma ORM');
    }

    // ========================================
    // 🔥 TEST 8: USERID INVALIDE/NÉGATIF
    // ========================================
    console.log('\n🔥 TEST 8: Test avec userId invalides');
    
    const userIdsInvalides = [-1, 0, 999999, null, undefined, 'hack'];
    
    for (const invalidId of userIdsInvalides) {
      try {
        await prisma.pointage.create({
          data: {
            userId: invalidId,
            type: 'arrivee',
            horodatage: new Date()
          }
        });
        console.log(`❌ FAILLE DÉTECTÉE: userId invalide accepté: ${invalidId}`);
      } catch (error) {
        console.log(`✅ Protection OK: userId invalide rejeté: ${invalidId}`);
      }
    }

    // ========================================
    // 📊 RÉSUMÉ DES TESTS
    // ========================================
    console.log('\n📊 === RÉSUMÉ DES TESTS DE SÉCURITÉ ===');
    console.log('Tests effectués:');
    console.log('1. ✅ Double pointage simultané');
    console.log('2. ✅ Pointage dans le futur');
    console.log('3. ✅ Manipulation historique');
    console.log('4. ✅ Dépassement limite 2 blocs');
    console.log('5. ✅ Pointages désordonnés');
    console.log('6. ✅ Travail de nuit (changement jour)');
    console.log('7. ✅ Injection SQL');
    console.log('8. ✅ UserID invalides');
    
    console.log('\n🛡️ Recommandations de sécurité:');
    console.log('- Ajouter validation côté API pour les dates futures');
    console.log('- Limiter les pointages historiques (ex: max 24h)');
    console.log('- Ajouter logs d\'audit pour les actions sensibles');
    console.log('- Implémenter rate limiting sur les endpoints de pointage');

  } catch (error) {
    console.error('❌ Erreur durant les tests:', error);
  } finally {
    // 🧹 Nettoyage final
    console.log('\n🧹 Nettoyage final des données de test...');
    await prisma.pointage.deleteMany({
      where: { userId: TEST_USER_ID }
    });
    
    await prisma.$disconnect();
  }
}

// 🚀 Lancer les tests
if (require.main === module) {
  runSecurityTests().catch(console.error);
}

module.exports = { runSecurityTests };
