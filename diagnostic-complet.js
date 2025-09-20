#!/usr/bin/env node
// diagnostic-complet.js - Script de diagnostic complet pour le système de cache et validation

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 === DIAGNOSTIC COMPLET SYSTÈME ANOMALIES ===\n');

// 1. Vérifier les fichiers critiques
console.log('1️⃣ Vérification des fichiers critiques...');

const filesToCheck = [
  'server/routes/anomaliesRoutes.js',
  'server/controllers/anomaliesController.js', 
  'server/middlewares/authMiddleware.js',
  'client/src/components/PlanningRH.jsx',
  'client/src/hooks/useAnomaliesDebug.js',
  'client/src/components/debug/AnomaliesDebugPanel.jsx'
];

filesToCheck.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file} - OK`);
  } else {
    console.log(`❌ ${file} - MANQUANT`);
  }
});

// 2. Vérifier la structure des routes
console.log('\n2️⃣ Vérification structure routes...');
try {
  const routesFile = path.join(process.cwd(), 'server/routes/anomaliesRoutes.js');
  const content = fs.readFileSync(routesFile, 'utf8');
  
  const requiredRoutes = [
    'router.get(\'/', // GET anomalies
    'router.put(\'/:id/traiter', // PUT traiter
    'router.post(\'/sync-from-comparison', // POST sync
  ];
  
  requiredRoutes.forEach(route => {
    if (content.includes(route)) {
      console.log(`✅ Route ${route} - OK`);
    } else {
      console.log(`❌ Route ${route} - MANQUANTE`);
    }
  });
  
  // Vérifier middleware
  if (content.includes('authMiddleware') && content.includes('adminMiddleware')) {
    console.log('✅ Middlewares auth/admin - OK');
  } else {
    console.log('❌ Middlewares auth/admin - PROBLÈME');
  }
  
} catch (e) {
  console.log('❌ Erreur vérification routes:', e.message);
}

// 3. Vérifier le middleware auth
console.log('\n3️⃣ Vérification middleware auth...');
try {
  const authFile = path.join(process.cwd(), 'server/middlewares/authMiddleware.js');
  const authContent = fs.readFileSync(authFile, 'utf8');
  
  if (authContent.includes('adminMiddleware') && authContent.includes('authMiddleware')) {
    console.log('✅ Export adminMiddleware & authMiddleware - OK');
  } else {
    console.log('❌ Export middleware - PROBLÈME');
  }
  
  if (authContent.includes('module.exports = {')) {
    console.log('✅ Export objet - OK');
  } else {
    console.log('❌ Export objet - PROBLÈME');
  }
  
} catch (e) {
  console.log('❌ Erreur vérification auth:', e.message);
}

// 4. Vérifier la logique cache côté client
console.log('\n4️⃣ Vérification logique cache frontend...');
try {
  const planningFile = path.join(process.cwd(), 'client/src/components/PlanningRH.jsx');
  const planningContent = fs.readFileSync(planningFile, 'utf8');
  
  const cacheFeatures = [
    'localStorage.getItem(\'processedAnomalies\')',
    'localStorage.setItem(\'processedAnomalies\'',
    'processedMap[anomalieId]',
    'console.log(\'🔍 Cache localStorage lu',
    'console.log(\'✅ Écart reconcilié via processedMap'
  ];
  
  cacheFeatures.forEach(feature => {
    if (planningContent.includes(feature)) {
      console.log(`✅ ${feature.slice(0,40)}... - OK`);
    } else {
      console.log(`❌ ${feature.slice(0,40)}... - MANQUANT`);
    }
  });
  
} catch (e) {
  console.log('❌ Erreur vérification cache:', e.message);
}

// 5. Vérifier les statuts dans le contrôleur
console.log('\n5️⃣ Vérification statuts contrôleur...');
try {
  const controllerFile = path.join(process.cwd(), 'server/controllers/anomaliesController.js');
  const controllerContent = fs.readFileSync(controllerFile, 'utf8');
  
  const statuts = ['VALIDEE', 'REFUSEE', 'CORRIGEE', 'EN_ATTENTE'];
  statuts.forEach(statut => {
    if (controllerContent.includes(`STATUTS.${statut}`)) {
      console.log(`✅ Statut ${statut} - OK`);
    } else {
      console.log(`❌ Statut ${statut} - MANQUANT`);
    }
  });
  
  if (controllerContent.includes('switch (action)')) {
    console.log('✅ Switch action traitement - OK');
  } else {
    console.log('❌ Switch action traitement - MANQUANT');
  }
  
} catch (e) {
  console.log('❌ Erreur vérification contrôleur:', e.message);
}

// 6. Recommandations de test
console.log('\n6️⃣ Recommandations de test:');
console.log('📱 Frontend (ouvrir navigateur + console F12):');
console.log('   1. debugAnomaliesSystem() - état général');
console.log('   2. localStorage.getItem("processedAnomalies")');
console.log('   3. Traiter anomalie et vérifier logs réconciliation');
console.log('   4. F5 refresh et vérifier persistance');
console.log('   5. Panneau debug (bouton 🐛) pour surveillance temps réel');

console.log('\n🚀 Backend (terminal serveur):');
console.log('   1. Démarrer: npm run dev ou node index.js');
console.log('   2. Logs traitement: "🔧 Anomalie X validée/refusée"');
console.log('   3. Test API: node diagnostic-anomalies.js');

console.log('\n🔧 Tests de bout en bout:');
console.log('   1. Créer une anomalie (écart planning vs réalité)');
console.log('   2. Valider/refuser via interface admin');
console.log('   3. Vérifier: boutons disparaissent immédiatement');
console.log('   4. Refresh (F5): état persistant');
console.log('   5. Attendre 30min ou vider cache: rechargé depuis DB');

// 7. Vérifications de sécurité
console.log('\n7️⃣ Points de sécurité à vérifier:');
console.log('   ✓ Middleware auth requis sur routes admin');
console.log('   ✓ Vérification rôle admin dans adminMiddleware');
console.log('   ✓ Token JWT validé avant traitement');
console.log('   ✓ Persistance DB des statuts traités');

console.log('\n✅ Diagnostic terminé - Vérifiez les points ❌ ci-dessus\n');

// 8. Génération d'un rapport JSON pour référence
const rapport = {
  timestamp: new Date().toISOString(),
  filesChecked: filesToCheck,
  recommendations: [
    'Vérifier logs console lors du traitement d\'anomalies',
    'Tester persistance après refresh',
    'Valider que les middlewares auth fonctionnent',
    'S\'assurer que les statuts DB sont corrects'
  ]
};

fs.writeFileSync('diagnostic-report.json', JSON.stringify(rapport, null, 2));
console.log('📄 Rapport sauvegardé: diagnostic-report.json');
