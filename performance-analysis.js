// performance-analysis.js - Script de test des optimisations

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000';

console.log('🚀 ANALYSE PERFORMANCE SYSTÈME RH');
console.log('=====================================\n');

async function analysePerformance() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    recommendations: []
  };

  try {
    // Test 1: Temps de réponse API anomalies
    console.log('📊 Test 1: Performance API anomalies...');
    const startAnomalies = Date.now();
    
    try {
      const anomaliesResponse = await axios.get(`${API_URL}/api/anomalies`, {
        timeout: 10000
      });
      const anomaliesTime = Date.now() - startAnomalies;
      
      results.tests.push({
        test: 'API Anomalies Response Time',
        duration: `${anomaliesTime}ms`,
        status: anomaliesTime < 500 ? 'EXCELLENT' : 
                anomaliesTime < 1000 ? 'BON' : 
                anomaliesTime < 2000 ? 'MOYEN' : 'CRITIQUE',
        data: {
          responseTime: anomaliesTime,
          count: anomaliesResponse.data?.length || 0
        }
      });
      
      console.log(`   ✅ Réponse en ${anomaliesTime}ms (${anomaliesResponse.data?.length || 0} anomalies)`);
      
    } catch (error) {
      console.log(`   ❌ Erreur API anomalies: ${error.message}`);
      results.tests.push({
        test: 'API Anomalies Response Time',
        status: 'ERREUR',
        error: error.message
      });
    }

    // Test 2: Performance comparaisons
    console.log('📊 Test 2: Performance API comparaisons...');
    const startComparaisons = Date.now();
    
    try {
      const comparaisonsResponse = await axios.get(`${API_URL}/api/comparaisons`, {
        timeout: 10000
      });
      const comparaisonsTime = Date.now() - startComparaisons;
      
      results.tests.push({
        test: 'API Comparaisons Response Time',
        duration: `${comparaisonsTime}ms`,
        status: comparaisonsTime < 1000 ? 'EXCELLENT' : 
                comparaisonsTime < 2000 ? 'BON' : 
                comparaisonsTime < 5000 ? 'MOYEN' : 'CRITIQUE',
        data: {
          responseTime: comparaisonsTime,
          count: comparaisonsResponse.data?.length || 0
        }
      });
      
      console.log(`   ✅ Réponse en ${comparaisonsTime}ms (${comparaisonsResponse.data?.length || 0} comparaisons)`);
      
    } catch (error) {
      console.log(`   ❌ Erreur API comparaisons: ${error.message}`);
      results.tests.push({
        test: 'API Comparaisons Response Time',
        status: 'ERREUR',
        error: error.message
      });
    }

    // Test 3: Analyse des fichiers optimisés
    console.log('📊 Test 3: Vérification fichiers optimisations...');
    
    const optimizationFiles = [
      'client/src/hooks/useOptimizedCache.js',
      'client/src/hooks/useOptimizedSelectors.js',
      'client/src/hooks/useBatchOperations.js',
      'client/src/components/LazyComponents.jsx',
      'client/src/components/VirtualizedList.jsx',
      'client/src/hooks/useWorkerCalculations.js',
      'client/public/workers/calculationsWorker.js'
    ];

    let filesOK = 0;
    for (const file of optimizationFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
        filesOK++;
      } else {
        console.log(`   ❌ ${file} MANQUANT`);
      }
    }

    results.tests.push({
      test: 'Fichiers Optimisations',
      status: filesOK === optimizationFiles.length ? 'COMPLET' : 'INCOMPLET',
      data: {
        present: filesOK,
        total: optimizationFiles.length,
        missing: optimizationFiles.length - filesOK
      }
    });

    // Test 4: Analyse bundle size (simulé)
    console.log('📊 Test 4: Analyse taille estimée des bundles...');
    
    const clientDir = path.join(__dirname, 'client/src');
    let totalSize = 0;
    let componentCount = 0;

    if (fs.existsSync(clientDir)) {
      const analyzeDir = (dir) => {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            analyzeDir(fullPath);
          } else if (item.endsWith('.jsx') || item.endsWith('.js')) {
            totalSize += stat.size;
            componentCount++;
          }
        });
      };

      analyzeDir(clientDir);
    }

    results.tests.push({
      test: 'Bundle Size Analysis',
      status: totalSize < 1024 * 1024 ? 'BON' : 'ATTENTION',
      data: {
        totalSizeKB: Math.round(totalSize / 1024),
        componentCount,
        averageSizeKB: Math.round(totalSize / 1024 / componentCount)
      }
    });

    console.log(`   📦 Taille totale: ${Math.round(totalSize / 1024)}KB`);
    console.log(`   📄 Composants: ${componentCount}`);
    console.log(`   📊 Taille moyenne: ${Math.round(totalSize / 1024 / componentCount)}KB par composant`);

    // Génération des recommandations
    console.log('\n🎯 RECOMMANDATIONS D\'OPTIMISATION:');
    
    // Recommandations basées sur les résultats
    const anomaliesTest = results.tests.find(t => t.test === 'API Anomalies Response Time');
    if (anomaliesTest && anomaliesTest.data?.responseTime > 1000) {
      results.recommendations.push({
        type: 'API Performance',
        priority: 'HIGH',
        description: 'API anomalies lente - implémenter cache Redis côté serveur',
        implementation: 'Server-side caching avec TTL 5min'
      });
      console.log('   🔥 HIGH: API anomalies lente - implémenter cache Redis côté serveur');
    }

    const comparaisonsTest = results.tests.find(t => t.test === 'API Comparaisons Response Time');
    if (comparaisonsTest && comparaisonsTest.data?.responseTime > 2000) {
      results.recommendations.push({
        type: 'API Performance',
        priority: 'HIGH',
        description: 'API comparaisons très lente - optimiser requêtes DB + pagination',
        implementation: 'Optimisation SQL + pagination côté serveur'
      });
      console.log('   🔥 HIGH: API comparaisons très lente - optimiser requêtes DB + pagination');
    }

    const bundleTest = results.tests.find(t => t.test === 'Bundle Size Analysis');
    if (bundleTest && bundleTest.data?.totalSizeKB > 512) {
      results.recommendations.push({
        type: 'Bundle Size',
        priority: 'MEDIUM',
        description: 'Bundle important - implémenter code splitting plus agressif',
        implementation: 'Lazy loading routes + dynamic imports'
      });
      console.log('   ⚠️ MEDIUM: Bundle important - implémenter code splitting plus agressif');
    }

    // Recommandations générales d'optimisation
    results.recommendations.push(
      {
        type: 'Monitoring',
        priority: 'MEDIUM',
        description: 'Implémenter monitoring performance temps réel',
        implementation: 'React Profiler + Web Vitals tracking'
      },
      {
        type: 'Database',
        priority: 'HIGH',
        description: 'Ajouter indexes DB sur colonnes fréquemment recherchées',
        implementation: 'Index sur employeId, jour, statut dans table anomalies'
      },
      {
        type: 'Caching',
        priority: 'HIGH',
        description: 'Implémenter cache intelligent multi-niveaux',
        implementation: 'localStorage (client) + Redis (serveur) + CDN (statique)'
      }
    );

    console.log('   📊 MEDIUM: Implémenter monitoring performance temps réel');
    console.log('   🔥 HIGH: Ajouter indexes DB sur colonnes fréquemment recherchées');
    console.log('   🔥 HIGH: Implémenter cache intelligent multi-niveaux');

    // Test 5: Simulation charge avec plusieurs requêtes concurrent
    console.log('\n📊 Test 5: Test de charge (5 requêtes simultanées)...');
    const loadTestStart = Date.now();
    
    try {
      const promises = Array.from({ length: 5 }, (_, i) => 
        axios.get(`${API_URL}/api/anomalies`, { timeout: 15000 })
          .then(response => ({ index: i, success: true, time: Date.now() - loadTestStart }))
          .catch(error => ({ index: i, success: false, error: error.message }))
      );

      const loadTestResults = await Promise.all(promises);
      const successCount = loadTestResults.filter(r => r.success).length;
      const loadTestTime = Date.now() - loadTestStart;

      results.tests.push({
        test: 'Load Test (5 concurrent)',
        duration: `${loadTestTime}ms`,
        status: successCount === 5 && loadTestTime < 3000 ? 'EXCELLENT' : 
                successCount >= 4 && loadTestTime < 5000 ? 'BON' : 'CRITIQUE',
        data: {
          totalTime: loadTestTime,
          successCount,
          totalRequests: 5,
          successRate: (successCount / 5) * 100
        }
      });

      console.log(`   📊 ${successCount}/5 requêtes réussies en ${loadTestTime}ms`);
      console.log(`   📈 Taux de succès: ${((successCount / 5) * 100).toFixed(1)}%`);

    } catch (error) {
      console.log(`   ❌ Erreur test de charge: ${error.message}`);
    }

    // Sauvegarde des résultats
    const reportFile = path.join(__dirname, 'performance-analysis-result.json');
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    
    console.log(`\n📁 Rapport sauvé dans: ${reportFile}`);
    
    // Résumé final
    console.log('\n📋 RÉSUMÉ FINAL:');
    console.log('================');
    
    const excellentTests = results.tests.filter(t => t.status === 'EXCELLENT').length;
    const bonTests = results.tests.filter(t => t.status === 'BON').length;
    const totalTests = results.tests.length;
    
    console.log(`✅ Tests réussis: ${excellentTests + bonTests}/${totalTests}`);
    console.log(`🎯 Recommandations: ${results.recommendations.length}`);
    
    const highPriorityRecs = results.recommendations.filter(r => r.priority === 'HIGH').length;
    if (highPriorityRecs > 0) {
      console.log(`🔥 Actions prioritaires: ${highPriorityRecs}`);
    }

    console.log('\n🚀 Prochaines étapes suggérées:');
    console.log('1. Implémenter cache Redis côté serveur');
    console.log('2. Ajouter indexes DB sur anomalies');  
    console.log('3. Optimiser requêtes comparaisons');
    console.log('4. Activer React.StrictMode pour détecter problèmes');
    console.log('5. Configurer Web Vitals monitoring');

    return results;

  } catch (error) {
    console.error('❌ Erreur analyse performance:', error.message);
    throw error;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  analysePerformance()
    .then(() => {
      console.log('\n✅ Analyse terminée avec succès!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Analyse échouée:', error.message);
      process.exit(1);
    });
}

module.exports = analysePerformance;
