const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function verifyAnomaliesSystem() {
  console.log('🔍 VÉRIFICATION SYSTÈME ANOMALIES\n');
  console.log('='.repeat(70));
  
  try {
    // 1. Vérifier les écarts générés par comparisonController
    console.log('\n📊 ÉTAPE 1: Récupération des écarts (semaine 8-14 déc)\n');
    
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: 56,
        date: {
          gte: new Date('2025-12-08T00:00:00Z'),
          lt: new Date('2025-12-15T00:00:00Z')
        }
      },
      orderBy: { date: 'asc' }
    });
    
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: 56,
        horodatage: {
          gte: new Date('2025-12-07T00:00:00Z'),
          lt: new Date('2025-12-16T00:00:00Z')
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log(`   ✅ Shifts trouvés: ${shifts.length}`);
    console.log(`   ✅ Pointages trouvés: ${pointages.length}`);
    
    // 2. Simuler le calcul d'écarts (version simplifiée)
    console.log('\n📊 ÉTAPE 2: Analyse des écarts par jour\n');
    
    const joursDec = [
      { date: '2025-12-08', ecarts: ['retard_critique', 'heures_sup_auto_validees'] },
      { date: '2025-12-09', ecarts: ['retard_modere', 'depart_anticipe'] },
      { date: '2025-12-10', ecarts: ['hors_plage_out'] },
      { date: '2025-12-11', ecarts: ['retard_critique'] },
      { date: '2025-12-12', ecarts: ['depart_anticipe'] },
      { date: '2025-12-13', ecarts: ['hors_plage_in'] },
      { date: '2025-12-14', ecarts: ['retard_modere'] }
    ];
    
    // 3. Tester la création d'anomalies
    console.log('\n📊 ÉTAPE 3: Test création anomalies\n');
    
    // Supprimer anciennes anomalies de test
    const deleted = await prisma.anomalie.deleteMany({
      where: {
        employeId: 56,
        date: {
          gte: new Date('2025-12-08T00:00:00Z'),
          lt: new Date('2025-12-15T00:00:00Z')
        }
      }
    });
    console.log(`   🗑️  Nettoyage: ${deleted.count} anciennes anomalies supprimées`);
    
    // Créer des anomalies de test pour chaque type
    let created = 0;
    const typesNonReconnus = [];
    
    for (const jour of joursDec) {
      const dateObj = new Date(jour.date + 'T00:00:00Z');
      
      for (const type of jour.ecarts) {
        try {
          const anomalie = await prisma.anomalie.create({
            data: {
              employeId: 56,
              date: dateObj,
              type: type,
              gravite: determineGravite(type),
              description: `Test ${type} pour ${jour.date}`,
              statut: 'en_attente',
              details: {
                ecartMinutes: 15,
                test: true
              }
            }
          });
          console.log(`   ✅ ${jour.date}: ${type} (gravité: ${anomalie.gravite})`);
          created++;
        } catch (error) {
          console.log(`   ❌ ${jour.date}: ${type} - ERREUR: ${error.message}`);
          typesNonReconnus.push(type);
        }
      }
    }
    
    console.log(`\n   📊 Résultat: ${created} anomalies créées`);
    if (typesNonReconnus.length > 0) {
      console.log(`   ⚠️  Types NON reconnus: ${typesNonReconnus.join(', ')}`);
    }
    
    // 4. Vérifier les anomalies créées
    console.log('\n📊 ÉTAPE 4: Vérification en base\n');
    
    const anomalies = await prisma.anomalie.findMany({
      where: {
        employeId: 56,
        date: {
          gte: new Date('2025-12-08T00:00:00Z'),
          lt: new Date('2025-12-15T00:00:00Z')
        }
      },
      orderBy: [
        { date: 'asc' },
        { type: 'asc' }
      ]
    });
    
    console.log(`   Total anomalies en base: ${anomalies.length}\n`);
    
    // Grouper par type
    const parType = {};
    const parGravite = {};
    
    anomalies.forEach(a => {
      parType[a.type] = (parType[a.type] || 0) + 1;
      parGravite[a.gravite] = (parGravite[a.gravite] || 0) + 1;
    });
    
    console.log('   📋 Par type:');
    Object.entries(parType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`      • ${type.padEnd(30)} : ${count}`);
    });
    
    console.log('\n   ⚠️  Par gravité:');
    Object.entries(parGravite).sort((a, b) => b[1] - a[1]).forEach(([gravite, count]) => {
      console.log(`      • ${gravite.padEnd(20)} : ${count}`);
    });
    
    // 5. Test des types spécifiques
    console.log('\n📊 ÉTAPE 5: Test types spécifiques\n');
    
    const typesCritiques = [
      'retard_critique',
      'hors_plage_in',
      'hors_plage_out_critique',
      'depart_premature_critique',
      'absence_totale',
      'segment_non_pointe'
    ];
    
    const typesValidation = [
      'heures_sup_a_valider',
      'hors_plage_out'
    ];
    
    const typesAuto = [
      'heures_sup_auto_validees',
      'retard_modere',
      'depart_anticipe'
    ];
    
    console.log('   🔴 Types CRITIQUES:');
    for (const type of typesCritiques) {
      const count = anomalies.filter(a => a.type === type).length;
      const gravite = anomalies.find(a => a.type === type)?.gravite || 'N/A';
      console.log(`      ${count > 0 ? '✅' : '❌'} ${type.padEnd(30)} : ${count} (gravité: ${gravite})`);
    }
    
    console.log('\n   ⚠️  Types À VALIDER:');
    for (const type of typesValidation) {
      const count = anomalies.filter(a => a.type === type).length;
      const gravite = anomalies.find(a => a.type === type)?.gravite || 'N/A';
      console.log(`      ${count > 0 ? '✅' : '❌'} ${type.padEnd(30)} : ${count} (gravité: ${gravite})`);
    }
    
    console.log('\n   ℹ️  Types AUTO-VALIDÉS:');
    for (const type of typesAuto) {
      const count = anomalies.filter(a => a.type === type).length;
      const gravite = anomalies.find(a => a.type === type)?.gravite || 'N/A';
      console.log(`      ${count > 0 ? '✅' : '⚠️ '} ${type.padEnd(30)} : ${count} (gravité: ${gravite})`);
    }
    
    // 6. Vérifier cohérence gravité
    console.log('\n📊 ÉTAPE 6: Vérification cohérence gravité\n');
    
    const incoherences = [];
    
    anomalies.forEach(a => {
      const graviteAttendue = determineGravite(a.type);
      if (a.gravite !== graviteAttendue) {
        incoherences.push({
          type: a.type,
          graviteEnBase: a.gravite,
          graviteAttendue: graviteAttendue
        });
      }
    });
    
    if (incoherences.length === 0) {
      console.log('   ✅ Toutes les gravités sont cohérentes');
    } else {
      console.log(`   ❌ ${incoherences.length} incohérence(s) détectée(s):`);
      incoherences.forEach(inc => {
        console.log(`      • ${inc.type}: en base="${inc.graviteEnBase}" attendu="${inc.graviteAttendue}"`);
      });
    }
    
    // Résumé final
    console.log('\n' + '='.repeat(70));
    console.log('\n🎯 RÉSUMÉ FINAL\n');
    
    const totalTypesGeneres = joursDec.reduce((acc, j) => acc + j.ecarts.length, 0);
    const tauxCreation = (created / totalTypesGeneres * 100).toFixed(0);
    
    console.log(`   📊 Taux de création: ${created}/${totalTypesGeneres} (${tauxCreation}%)`);
    console.log(`   📋 Types uniques en base: ${Object.keys(parType).length}`);
    console.log(`   ⚠️  Gravités utilisées: ${Object.keys(parGravite).join(', ')}`);
    console.log(`   ${incoherences.length === 0 ? '✅' : '❌'} Cohérence gravités: ${incoherences.length === 0 ? 'OK' : incoherences.length + ' erreur(s)'}`);
    console.log(`   ${typesNonReconnus.length === 0 ? '✅' : '❌'} Types reconnus: ${typesNonReconnus.length === 0 ? 'Tous' : typesNonReconnus.length + ' manquant(s)'}`);
    
    if (tauxCreation >= 90 && incoherences.length === 0 && typesNonReconnus.length === 0) {
      console.log('\n   🎉 SYSTÈME ANOMALIES: ✅ FONCTIONNEL');
    } else {
      console.log('\n   ⚠️  SYSTÈME ANOMALIES: ❌ CORRECTIONS NÉCESSAIRES');
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction locale pour déterminer la gravité attendue
function determineGravite(type) {
  // Critiques
  if (['retard_critique', 'depart_premature_critique', 'absence_totale', 
       'absence_planifiee_avec_pointage', 'presence_non_prevue',
       'segment_non_pointe', 'missing_in', 'missing_out'].includes(type)) {
    return 'critique';
  }
  
  // Hors-plage
  if (['hors_plage_in', 'hors_plage_out_critique'].includes(type)) {
    return 'hors_plage';
  }
  
  // À valider
  if (['heures_sup_a_valider', 'hors_plage_out'].includes(type)) {
    return 'a_valider';
  }
  
  // Attention
  if (['retard_modere', 'depart_anticipe', 'pointage_hors_planning', 'hors_plage'].includes(type)) {
    return 'attention';
  }
  
  // Info
  if (['heures_sup_auto_validees', 'arrivee_acceptable', 'depart_acceptable', 
       'absence_conforme', 'retard', 'heures_sup'].includes(type)) {
    return 'info';
  }
  
  return 'info'; // Par défaut
}

verifyAnomaliesSystem();
