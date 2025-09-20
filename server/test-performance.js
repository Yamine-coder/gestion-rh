/**
 * 🔍 TESTS DE PERFORMANCE - SYSTÈME POINTAGE
 * Teste les performances sous charge et détecte les goulots d'étranglement
 */

const { PrismaClient } = require('@prisma/client');
const { getWorkDayBounds } = require('./config/workDayConfig');

const prisma = new PrismaClient();

// 🎯 Configuration des tests de performance
const PERF_CONFIG = {
  nombreEmployes: 50,
  pointagesParEmploye: 100,
  concurrentQueries: 20
};

async function runPerformanceTests() {
  console.log('🚀 === TESTS DE PERFORMANCE - SYSTÈME POINTAGE ===\n');
  console.log(`Configuration: ${PERF_CONFIG.nombreEmployes} employés, ${PERF_CONFIG.pointagesParEmploye} pointages/employé\n`);

  try {
    // ========================================
    // 🔥 TEST 1: CRÉATION EN MASSE DE POINTAGES
    // ========================================
    console.log('🔥 TEST 1: Création en masse de pointages');
    
    const startCreation = Date.now();
    const pointagesData = [];
    
    for (let userId = 1; userId <= PERF_CONFIG.nombreEmployes; userId++) {
      for (let i = 0; i < PERF_CONFIG.pointagesParEmploye; i++) {
        const baseTime = new Date();
        baseTime.setDate(baseTime.getDate() - Math.floor(Math.random() * 30)); // Répartir sur 30 jours
        baseTime.setHours(8 + Math.floor(Math.random() * 10)); // Entre 8h et 18h
        baseTime.setMinutes(Math.random() * 60);
        
        pointagesData.push({
          userId,
          type: i % 2 === 0 ? 'arrivee' : 'depart',
          horodatage: baseTime
        });
      }
    }

    // Insérer par batch pour de meilleures performances
    const batchSize = 1000;
    for (let i = 0; i < pointagesData.length; i += batchSize) {
      const batch = pointagesData.slice(i, i + batchSize);
      await prisma.pointage.createMany({
        data: batch,
        skipDuplicates: true
      });
      
      if (i % 5000 === 0) {
        console.log(`Progression: ${i + batchSize}/${pointagesData.length} pointages créés`);
      }
    }

    const creationTime = Date.now() - startCreation;
    console.log(`✅ ${pointagesData.length} pointages créés en ${creationTime}ms (${Math.round(pointagesData.length / (creationTime / 1000))} pointages/sec)`);

    // ========================================
    // 🔥 TEST 2: REQUÊTES COMPLEXES SOUS CHARGE
    // ========================================
    console.log('\n🔥 TEST 2: Requêtes complexes sous charge');
    
    const { debutJournee, finJournee } = getWorkDayBounds();
    
    // Test de requêtes concurrent es
    const queries = [];
    const startQueries = Date.now();
    
    for (let i = 0; i < PERF_CONFIG.concurrentQueries; i++) {
      queries.push(
        prisma.pointage.findMany({
          where: {
            userId: Math.ceil(Math.random() * PERF_CONFIG.nombreEmployes),
            horodatage: { gte: debutJournee, lt: finJournee }
          },
          orderBy: { horodatage: 'asc' }
        })
      );
    }

    const results = await Promise.all(queries);
    const queriesTime = Date.now() - startQueries;
    const avgQueryTime = queriesTime / PERF_CONFIG.concurrentQueries;
    
    console.log(`✅ ${PERF_CONFIG.concurrentQueries} requêtes concurrentes en ${queriesTime}ms (avg: ${avgQueryTime.toFixed(2)}ms/requête)`);

    // ========================================
    // 🔥 TEST 3: CALCUL DE TEMPS EN MASSE
    // ========================================
    console.log('\n🔥 TEST 3: Calculs de temps en masse');
    
    const startCalc = Date.now();
    const tempsCalculs = [];
    
    for (let userId = 1; userId <= Math.min(10, PERF_CONFIG.nombreEmployes); userId++) {
      const pointagesUser = await prisma.pointage.findMany({
        where: {
          userId,
          horodatage: { gte: debutJournee, lt: finJournee }
        },
        orderBy: { horodatage: 'asc' }
      });

      let totalMinutes = 0;
      for (let i = 0; i < pointagesUser.length - 1; i++) {
        const debut = pointagesUser[i];
        const fin = pointagesUser[i + 1];

        if (debut.type === 'arrivee' && fin.type === 'depart') {
          const diffMs = new Date(fin.horodatage) - new Date(debut.horodatage);
          const minutes = Math.floor(diffMs / 60000);
          if (minutes > 0) {
            totalMinutes += minutes;
          }
        }
      }
      
      tempsCalculs.push({ userId, totalMinutes });
    }

    const calcTime = Date.now() - startCalc;
    console.log(`✅ Calculs pour ${tempsCalculs.length} employés en ${calcTime}ms (avg: ${(calcTime / tempsCalculs.length).toFixed(2)}ms/employé)`);

    // ========================================
    // 🔥 TEST 4: REQUÊTE GROUPÉE ADMINISTRATIVE
    // ========================================
    console.log('\n🔥 TEST 4: Requête groupée administrative (simulation vue admin)');
    
    const startAdmin = Date.now();
    
    const statsAdmin = await prisma.pointage.groupBy({
      by: ['userId'],
      where: {
        horodatage: { gte: debutJournee, lt: finJournee }
      },
      _count: {
        id: true
      }
    });

    const adminTime = Date.now() - startAdmin;
    console.log(`✅ Stats admin pour ${statsAdmin.length} employés en ${adminTime}ms`);

    // ========================================
    // 🔥 TEST 5: STRESS TEST - CRÉATION SIMULTANÉE
    // ========================================
    console.log('\n🔥 TEST 5: Stress test - créations simultanées');
    
    const stressRequests = [];
    const startStress = Date.now();
    
    for (let i = 0; i < 50; i++) {
      stressRequests.push(
        prisma.pointage.create({
          data: {
            userId: Math.ceil(Math.random() * PERF_CONFIG.nombreEmployes),
            type: Math.random() > 0.5 ? 'arrivee' : 'depart',
            horodatage: new Date()
          }
        }).catch(error => ({ error: error.message }))
      );
    }

    const stressResults = await Promise.all(stressRequests);
    const stressTime = Date.now() - startStress;
    const successes = stressResults.filter(r => !r.error).length;
    const errors = stressResults.filter(r => r.error).length;
    
    console.log(`✅ Stress test: ${successes} succès, ${errors} erreurs en ${stressTime}ms`);

    // ========================================
    // 🔥 TEST 6: ANALYSE DES INDEX DATABASE
    // ========================================
    console.log('\n🔥 TEST 6: Analyse performance des requêtes');
    
    // Requête complexe avec EXPLAIN (si supporté)
    const startComplexe = Date.now();
    
    const requeteComplexe = await prisma.pointage.findMany({
      where: {
        AND: [
          { horodatage: { gte: debutJournee } },
          { horodatage: { lt: finJournee } },
          { userId: { in: [1, 2, 3, 4, 5] } }
        ]
      },
      include: {
        user: {
          select: { email: true, nom: true, prenom: true }
        }
      },
      orderBy: [
        { userId: 'asc' },
        { horodatage: 'asc' }
      ]
    });

    const complexeTime = Date.now() - startComplexe;
    console.log(`✅ Requête complexe avec JOIN: ${requeteComplexe.length} résultats en ${complexeTime}ms`);

    // ========================================
    // 📊 RÉSUMÉ DES PERFORMANCES
    // ========================================
    console.log('\n📊 === RÉSUMÉ DES PERFORMANCES ===');
    console.log(`Données de test: ${pointagesData.length} pointages créés`);
    console.log(`Vitesse création: ${Math.round(pointagesData.length / (creationTime / 1000))} pointages/sec`);
    console.log(`Requêtes concurrentes: ${avgQueryTime.toFixed(2)}ms en moyenne`);
    console.log(`Calculs de temps: ${(calcTime / tempsCalculs.length).toFixed(2)}ms par employé`);
    console.log(`Stats admin: ${adminTime}ms`);
    console.log(`Stress test: ${(successes / (successes + errors) * 100).toFixed(1)}% de succès`);
    
    console.log('\n🎯 Recommandations d\'optimisation:');
    
    if (avgQueryTime > 100) {
      console.log('- ⚠️  Ajouter des index sur (userId, horodatage)');
    }
    
    if (creationTime / pointagesData.length > 10) {
      console.log('- ⚠️  Optimiser les insertions batch');
    }
    
    if (complexeTime > 500) {
      console.log('- ⚠️  Ajouter des index composites pour les requêtes admin');
    }
    
    console.log('- ✅ Implémenter un cache Redis pour les requêtes fréquentes');
    console.log('- ✅ Utiliser la pagination pour les grosses listes');
    console.log('- ✅ Ajouter des index partiels pour les requêtes du jour');

    // ========================================
    // 🔍 ANALYSE MÉMOIRE
    // ========================================
    console.log('\n🔍 === ANALYSE MÉMOIRE ===');
    const memUsage = process.memoryUsage();
    
    console.log(`Mémoire utilisée: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`Mémoire totale: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    console.log(`Mémoire externe: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
    
    if (memUsage.heapUsed > 100 * 1024 * 1024) { // > 100MB
      console.log('⚠️  Consommation mémoire élevée - vérifier les fuites mémoire');
    }

  } catch (error) {
    console.error('❌ Erreur durant les tests de performance:', error);
  } finally {
    // 🧹 Nettoyage (optionnel - garder les données pour d'autres tests)
    console.log('\n🧹 Nettoyage des données de test...');
    console.log('(Conservé pour analyse - nettoyer manuellement si nécessaire)');
    
    await prisma.$disconnect();
  }
}

// 🚀 Lancer les tests de performance
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = { runPerformanceTests };
