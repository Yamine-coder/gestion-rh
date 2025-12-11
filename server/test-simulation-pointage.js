/**
 * 🧪 SIMULATION COMPLÈTE DU FLUX POINTAGE
 * 
 * Ce script simule le parcours complet d'un employé :
 * 1. Création d'un shift pour aujourd'hui
 * 2. Simulation de scans QR (pointages)
 * 3. Vérification des anomalies détectées
 * 4. Affichage de ce que le front verrait
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration du test
const SCENARIOS = {
  NORMAL: 'normal',                    // Arrivée/départ normaux
  RETARD_MODERE: 'retard_modere',      // Arrivée 15 min en retard
  RETARD_CRITIQUE: 'retard_critique',  // Arrivée 45 min en retard
  DEPART_ANTICIPE: 'depart_anticipe',  // Départ 30 min avant
  DEPART_CRITIQUE: 'depart_critique',  // Départ 2h avant
  HORS_PLAGE_IN: 'hors_plage_in',      // Arrivée 1h en avance
  HORS_PLAGE_OUT: 'hors_plage_out',    // Départ 3h après
  PAUSE_NON_PRISE: 'pause_non_prise',  // Travail continu sans pause
  HORS_PLANNING: 'hors_planning',      // Pointage sans shift
  PENDANT_CONGE: 'pendant_conge',      // Pointage pendant congé
  MISSING_OUT: 'missing_out',          // Oubli de pointer sortie
  MISSING_IN: 'missing_in',            // Oubli de pointer entrée
};

async function getOrCreateTestEmployee() {
  let employe = await prisma.user.findFirst({
    where: { email: 'test.simulation@restaurant.fr' }
  });
  
  if (!employe) {
    employe = await prisma.user.create({
      data: {
        email: 'test.simulation@restaurant.fr',
        password: '$2b$10$test',
        nom: 'Simulation',
        prenom: 'Test',
        role: 'employee',
        statut: 'actif'
      }
    });
    console.log('✅ Employé test créé:', employe.id);
  }
  
  return employe;
}

async function cleanupTestData(employeId, dateStr) {
  // Supprimer les données de test du jour
  await prisma.anomalie.deleteMany({
    where: {
      employeId,
      date: {
        gte: new Date(`${dateStr}T00:00:00.000Z`),
        lt: new Date(`${dateStr}T23:59:59.999Z`)
      }
    }
  });
  
  await prisma.pointage.deleteMany({
    where: {
      userId: employeId,
      horodatage: {
        gte: new Date(`${dateStr}T00:00:00.000Z`),
        lt: new Date(`${dateStr}T23:59:59.999Z`)
      }
    }
  });
  
  await prisma.shift.deleteMany({
    where: {
      employeId,
      date: {
        gte: new Date(`${dateStr}T00:00:00.000Z`),
        lt: new Date(`${dateStr}T23:59:59.999Z`)
      }
    }
  });
}

async function createShift(employeId, dateStr, type, segments) {
  return await prisma.shift.create({
    data: {
      employeId,
      date: new Date(`${dateStr}T00:00:00.000Z`),
      type,
      segments
    }
  });
}

async function simulatePointage(employeId, dateStr, heure, type) {
  // Créer la date en heure locale Paris (UTC+1 en hiver)
  const [h, m] = heure.split(':').map(Number);
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  // Ajuster pour Paris (UTC+1)
  date.setUTCHours(h - 1, m, 0, 0);
  
  const pointage = await prisma.pointage.create({
    data: {
      userId: employeId,
      type,
      horodatage: date
    }
  });
  
  console.log(`   📱 Scan QR: ${type === 'ENTRÉE' ? '🟢 ENTRÉE' : '🔴 SORTIE'} à ${heure} (UTC: ${date.toISOString()})`);
  return pointage;
}

async function runSchedulerCheck(employeId, dateStr) {
  const scheduler = require('./services/anomalyScheduler');
  
  // Récupérer le shift
  const shift = await prisma.shift.findFirst({
    where: {
      employeId,
      date: {
        gte: new Date(`${dateStr}T00:00:00.000Z`),
        lt: new Date(`${dateStr}T23:59:59.999Z`)
      },
      type: { in: ['travail', 'présence', 'presence'] }
    },
    include: {
      employe: { select: { id: true, nom: true, prenom: true, statut: true } }
    }
  });
  
  if (shift) {
    // Récupérer les pointages
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employeId,
        horodatage: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lt: new Date(`${dateStr}T23:59:59.999Z`)
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    const entrees = pointages.filter(p => p.type === 'ENTRÉE' || p.type === 'arrivee');
    const sorties = pointages.filter(p => p.type === 'SORTIE' || p.type === 'depart');
    
    // Appeler checkForAbsence qui fait toute la logique
    await scheduler.checkForAbsence(shift, dateStr);
    await scheduler.checkPauseNonPrise(shift, entrees, sorties, dateStr);
  }
  
  // Vérifier aussi les pointages sans shift
  await scheduler.checkPointagesSansShift(dateStr);
}

async function getAnomalies(employeId, dateStr) {
  return await prisma.anomalie.findMany({
    where: {
      employeId,
      date: {
        gte: new Date(`${dateStr}T00:00:00.000Z`),
        lt: new Date(`${dateStr}T23:59:59.999Z`)
      }
    }
  });
}

function displayFrontendView(anomalies, scenario) {
  console.log('\n' + '='.repeat(60));
  console.log('📱 VUE FRONTEND - Ce que l\'employé verrait');
  console.log('='.repeat(60));
  
  if (anomalies.length === 0) {
    console.log('✅ Aucune anomalie détectée - Tout est OK!');
    return;
  }
  
  console.log(`\n⚠️ ${anomalies.length} anomalie(s) détectée(s):\n`);
  
  const typeLabels = {
    'absence_injustifiee': '🚨 Absence non justifiée',
    'retard_modere': '⏰ Retard modéré',
    'retard_critique': '🔴 Retard critique',
    'hors_plage_in': '📍 Arrivée hors plage',
    'hors_plage_out': '📍 Départ hors plage',
    'depart_anticipe': '🚪 Départ anticipé',
    'depart_premature_critique': '🚪 Départ prématuré critique',
    'heures_sup_a_valider': '⏱️ Heures sup à valider',
    'missing_in': '❓ Entrée manquante',
    'missing_out': '❓ Sortie manquante',
    'pause_non_prise': '☕ Pause non prise',
    'depassement_amplitude': '⚠️ Dépassement amplitude',
    'pointage_hors_planning': '⚡ Pointage hors planning',
    'pointage_pendant_conge': '🏖️ Pointage pendant congé'
  };
  
  const graviteColors = {
    'critique': '🔴',
    'haute': '🟠',
    'moyenne': '🟡',
    'basse': '🟢'
  };
  
  for (const a of anomalies) {
    const label = typeLabels[a.type] || a.type;
    const gravite = graviteColors[a.gravite] || '⚪';
    
    console.log(`┌─ ${label}`);
    console.log(`│  Gravité: ${gravite} ${a.gravite?.toUpperCase()}`);
    console.log(`│  ${a.description}`);
    console.log(`└─ Statut: ${a.statut}`);
    console.log('');
  }
}

async function runScenario(scenario) {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('\n' + '═'.repeat(60));
  console.log(`🎬 SCÉNARIO: ${scenario.toUpperCase()}`);
  console.log('═'.repeat(60));
  
  const employe = await getOrCreateTestEmployee();
  await cleanupTestData(employe.id, today);
  
  console.log(`\n👤 Employé: ${employe.prenom} ${employe.nom} (ID: ${employe.id})`);
  console.log(`📅 Date: ${today}`);
  
  switch (scenario) {
    case SCENARIOS.NORMAL:
      console.log('\n📋 Shift prévu: 09:00-17:00');
      await createShift(employe.id, today, 'travail', [
        { type: 'travail', start: '09:00', end: '17:00' }
      ]);
      console.log('\n🔄 Simulation pointages:');
      await simulatePointage(employe.id, today, '09:00', 'ENTRÉE');
      await simulatePointage(employe.id, today, '17:00', 'SORTIE');
      break;
      
    case SCENARIOS.RETARD_MODERE:
      console.log('\n📋 Shift prévu: 09:00-17:00');
      await createShift(employe.id, today, 'travail', [
        { type: 'travail', start: '09:00', end: '17:00' }
      ]);
      console.log('\n🔄 Simulation pointages (15 min de retard):');
      await simulatePointage(employe.id, today, '09:15', 'ENTRÉE');
      await simulatePointage(employe.id, today, '17:00', 'SORTIE');
      break;
      
    case SCENARIOS.RETARD_CRITIQUE:
      console.log('\n📋 Shift prévu: 09:00-17:00');
      await createShift(employe.id, today, 'travail', [
        { type: 'travail', start: '09:00', end: '17:00' }
      ]);
      console.log('\n🔄 Simulation pointages (45 min de retard):');
      await simulatePointage(employe.id, today, '09:45', 'ENTRÉE');
      await simulatePointage(employe.id, today, '17:00', 'SORTIE');
      break;
      
    case SCENARIOS.DEPART_ANTICIPE:
      console.log('\n📋 Shift prévu: 09:00-17:00');
      await createShift(employe.id, today, 'travail', [
        { type: 'travail', start: '09:00', end: '17:00' }
      ]);
      console.log('\n🔄 Simulation pointages (30 min de départ anticipé):');
      await simulatePointage(employe.id, today, '09:00', 'ENTRÉE');
      await simulatePointage(employe.id, today, '16:30', 'SORTIE');
      break;
      
    case SCENARIOS.DEPART_CRITIQUE:
      console.log('\n📋 Shift prévu: 09:00-17:00');
      await createShift(employe.id, today, 'travail', [
        { type: 'travail', start: '09:00', end: '17:00' }
      ]);
      console.log('\n🔄 Simulation pointages (2h de départ anticipé):');
      await simulatePointage(employe.id, today, '09:00', 'ENTRÉE');
      await simulatePointage(employe.id, today, '15:00', 'SORTIE');
      break;
      
    case SCENARIOS.HORS_PLAGE_IN:
      console.log('\n📋 Shift prévu: 09:00-17:00');
      await createShift(employe.id, today, 'travail', [
        { type: 'travail', start: '09:00', end: '17:00' }
      ]);
      console.log('\n🔄 Simulation pointages (1h en avance):');
      await simulatePointage(employe.id, today, '08:00', 'ENTRÉE');
      await simulatePointage(employe.id, today, '17:00', 'SORTIE');
      break;
      
    case SCENARIOS.HORS_PLAGE_OUT:
      console.log('\n📋 Shift prévu: 09:00-17:00');
      await createShift(employe.id, today, 'travail', [
        { type: 'travail', start: '09:00', end: '17:00' }
      ]);
      console.log('\n🔄 Simulation pointages (3h après):');
      await simulatePointage(employe.id, today, '09:00', 'ENTRÉE');
      await simulatePointage(employe.id, today, '20:00', 'SORTIE');
      break;
      
    case SCENARIOS.PAUSE_NON_PRISE:
      console.log('\n📋 Shift prévu: 09:00-13:00 + PAUSE 13:00-14:00 + 14:00-17:00');
      await createShift(employe.id, today, 'travail', [
        { type: 'travail', start: '09:00', end: '13:00' },
        { type: 'pause', start: '13:00', end: '14:00' },
        { type: 'travail', start: '14:00', end: '17:00' }
      ]);
      console.log('\n🔄 Simulation pointages (travail continu sans pause):');
      await simulatePointage(employe.id, today, '09:00', 'ENTRÉE');
      await simulatePointage(employe.id, today, '17:00', 'SORTIE');
      break;
      
    case SCENARIOS.HORS_PLANNING:
      console.log('\n📋 PAS de shift prévu');
      console.log('\n🔄 Simulation pointages (travail non planifié):');
      await simulatePointage(employe.id, today, '10:00', 'ENTRÉE');
      await simulatePointage(employe.id, today, '18:00', 'SORTIE');
      break;
      
    case SCENARIOS.PENDANT_CONGE:
      console.log('\n📋 Shift prévu: CONGÉ');
      await createShift(employe.id, today, 'conge', []);
      console.log('\n🔄 Simulation pointages (travail pendant congé!):');
      await simulatePointage(employe.id, today, '09:00', 'ENTRÉE');
      await simulatePointage(employe.id, today, '17:00', 'SORTIE');
      break;
      
    case SCENARIOS.MISSING_OUT:
      console.log('\n📋 Shift prévu: 09:00-17:00');
      await createShift(employe.id, today, 'travail', [
        { type: 'travail', start: '09:00', end: '17:00' }
      ]);
      console.log('\n🔄 Simulation pointages (oubli de sortie):');
      await simulatePointage(employe.id, today, '09:00', 'ENTRÉE');
      // PAS de pointage de sortie!
      break;
      
    case SCENARIOS.MISSING_IN:
      console.log('\n📋 Shift prévu: 09:00-17:00');
      await createShift(employe.id, today, 'travail', [
        { type: 'travail', start: '09:00', end: '17:00' }
      ]);
      console.log('\n🔄 Simulation pointages (oubli d\'entrée):');
      // PAS de pointage d'entrée!
      await simulatePointage(employe.id, today, '17:00', 'SORTIE');
      break;
  }
  
  // Attendre un peu puis lancer le scheduler
  console.log('\n⏳ Analyse par le scheduler...');
  await runSchedulerCheck(employe.id, today);
  
  // Récupérer et afficher les anomalies
  const anomalies = await getAnomalies(employe.id, today);
  displayFrontendView(anomalies, scenario);
  
  return anomalies;
}

async function runAllScenarios() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('   SIMULATION COMPLÈTE DU SYSTÈME DE POINTAGE');
  console.log('🚀'.repeat(30));
  
  const results = {};
  
  for (const [name, scenario] of Object.entries(SCENARIOS)) {
    try {
      const anomalies = await runScenario(scenario);
      results[name] = {
        success: true,
        anomaliesCount: anomalies.length,
        types: anomalies.map(a => a.type)
      };
    } catch (error) {
      console.error(`❌ Erreur scénario ${name}:`, error.message);
      results[name] = { success: false, error: error.message };
    }
  }
  
  // Résumé final
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('═'.repeat(60));
  
  for (const [name, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    const details = result.success 
      ? `${result.anomaliesCount} anomalie(s): ${result.types.join(', ') || 'aucune'}`
      : result.error;
    console.log(`${status} ${name.padEnd(20)} → ${details}`);
  }
}

// Exécution
const args = process.argv.slice(2);
const scenario = args[0];

(async () => {
  try {
    if (scenario && SCENARIOS[scenario.toUpperCase()]) {
      await runScenario(SCENARIOS[scenario.toUpperCase()]);
    } else if (scenario === 'all') {
      await runAllScenarios();
    } else {
      console.log('Usage: node test-simulation-pointage.js [scenario|all]');
      console.log('\nScénarios disponibles:');
      Object.keys(SCENARIOS).forEach(s => console.log(`  - ${s}`));
      console.log('  - all (tous les scénarios)');
      
      // Par défaut, lancer un scénario rapide
      console.log('\n🎯 Lancement du scénario RETARD_MODERE par défaut...');
      await runScenario(SCENARIOS.RETARD_MODERE);
    }
  } catch (error) {
    console.error('Erreur globale:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
