/**
 * 🧪 Script de test complet pour les anomalies côté employé
 * 
 * Ce script crée des cas de figures réalistes d'anomalies pour tester:
 * - Le widget "Anomalies du jour" dans Pointage.jsx
 * - La page historique MesAnomalies.jsx
 * - La sécurité (chaque employé ne voit que SES anomalies)
 * 
 * Usage: node test-anomalies-employe-view.js
 */

const prisma = require('./server/prisma/client');

// Configuration
const CONFIG = {
  // ID de l'employé de test (à adapter selon votre base)
  // Si null, prendra le premier employé trouvé
  employeTestId: null,
  
  // Nettoyer les anomalies de test avant création
  cleanupBefore: true,
  
  // Préfixe pour identifier les anomalies de test
  testPrefix: '[TEST-EMPLOYE]'
};

// Palette de scénarios réalistes
const SCENARIOS = {
  // ===== RETARDS =====
  retard_leger: {
    type: 'retard',
    gravite: 'info',
    description: 'Retard léger de 8 minutes - Arrivée à 09:08 au lieu de 09:00',
    details: {
      ecartMinutes: 8,
      heurePrevu: '09:00',
      heureReelle: '09:08',
      segment: 1,
      toleranceMinutes: 5
    }
  },
  
  retard_modere: {
    type: 'retard_modere',
    gravite: 'attention',
    description: 'Retard de 22 minutes - Arrivée à 09:22 au lieu de 09:00',
    details: {
      ecartMinutes: 22,
      heurePrevu: '09:00',
      heureReelle: '09:22',
      segment: 1,
      retardMinutes: 22
    }
  },
  
  retard_critique: {
    type: 'retard_critique',
    gravite: 'critique',
    description: 'Retard critique de 1h15 - Arrivée à 10:15 au lieu de 09:00',
    details: {
      ecartMinutes: 75,
      heurePrevu: '09:00',
      heureReelle: '10:15',
      segment: 1,
      retardMinutes: 75
    }
  },

  // ===== DEPARTS =====
  depart_anticipe: {
    type: 'depart_anticipe',
    gravite: 'attention',
    description: 'Départ anticipé de 30 minutes - Parti à 17:30 au lieu de 18:00',
    details: {
      ecartMinutes: 30,
      heurePrevu: '18:00',
      heureReelle: '17:30',
      segment: 2
    }
  },
  
  depart_premature: {
    type: 'depart_premature_critique',
    gravite: 'critique',
    description: 'Départ prématuré de 2h30 - Parti à 15:30 au lieu de 18:00',
    details: {
      ecartMinutes: 150,
      heurePrevu: '18:00',
      heureReelle: '15:30',
      segment: 2
    }
  },

  // ===== HEURES SUPPLEMENTAIRES =====
  heures_sup_validees: {
    type: 'heures_sup_auto_validees',
    gravite: 'ok',
    description: 'Heures supplémentaires 45min auto-validées (service rush)',
    details: {
      heuresSupp: 0.75,
      heureDebut: '18:00',
      heureFin: '18:45',
      motif: 'Service du soir chargé'
    },
    heuresExtra: 0.75,
    montantExtra: 11.25
  },
  
  heures_sup_a_valider: {
    type: 'heures_sup_a_valider',
    gravite: 'a_valider',
    description: 'Heures supplémentaires 2h30 à valider (inventaire)',
    details: {
      heuresSupp: 2.5,
      heureDebut: '18:00',
      heureFin: '20:30',
      motif: 'Inventaire mensuel'
    },
    heuresExtra: 2.5
  },

  // ===== HORS PLAGE =====
  hors_plage_arrivee: {
    type: 'hors_plage_in',
    gravite: 'hors_plage',
    description: 'Arrivée hors plage - Pointage à 06:30 au lieu de 09:00',
    details: {
      ecartMinutes: -150,
      heurePrevu: '09:00',
      heureReelle: '06:30',
      segment: 1,
      horsPlage: true
    }
  },
  
  hors_plage_depart: {
    type: 'hors_plage_out_critique',
    gravite: 'hors_plage',
    description: 'Départ hors plage - Pointage à 23:45 au lieu de 22:00',
    details: {
      ecartMinutes: 105,
      heurePrevu: '22:00',
      heureReelle: '23:45',
      segment: 2,
      horsPlage: true
    }
  },

  // ===== POINTAGES MANQUANTS =====
  missing_arrivee: {
    type: 'missing_in',
    gravite: 'attention',
    description: 'Pointage d\'arrivée manquant - Segment matin',
    details: {
      segment: 1,
      heurePrevu: '09:00',
      heureReelle: null
    }
  },
  
  missing_depart: {
    type: 'missing_out',
    gravite: 'attention',
    description: 'Pointage de départ manquant - Segment soir',
    details: {
      segment: 2,
      heurePrevu: '22:00',
      heureReelle: null
    }
  },

  // ===== CAS SPECIAUX =====
  presence_non_prevue: {
    type: 'presence_non_prevue',
    gravite: 'attention',
    description: 'Pointage détecté alors qu\'aucun shift n\'était prévu',
    details: {
      heurePointage: '14:30',
      commentaire: 'Remplacement de dernière minute ?'
    }
  },
  
  absence_avec_pointage: {
    type: 'absence_planifiee_avec_pointage',
    gravite: 'critique',
    description: 'Pointage détecté malgré une absence planifiée (congé)',
    details: {
      typeAbsence: 'congé',
      heurePointage: '09:15'
    }
  }
};

// Statuts pour créer de la variété
const STATUTS_VARIETES = [
  { statut: 'en_attente', weight: 5 },      // 50% en attente
  { statut: 'validee', weight: 2 },          // 20% validées
  { statut: 'refusee', weight: 1 },          // 10% refusées
  { statut: 'corrigee', weight: 1 },         // 10% corrigées
  { statut: 'obsolete', weight: 1 }          // 10% obsolètes
];

// Helpers
function getRandomStatut() {
  const totalWeight = STATUTS_VARIETES.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const s of STATUTS_VARIETES) {
    random -= s.weight;
    if (random <= 0) return s.statut;
  }
  return 'en_attente';
}

function getDateRelative(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Main
async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 TEST ANOMALIES - VUE EMPLOYÉ');
  console.log('═'.repeat(70));
  
  try {
    // 1. Trouver ou sélectionner un employé de test
    console.log('\n📋 Étape 1: Sélection de l\'employé de test...');
    
    let employe;
    if (CONFIG.employeTestId) {
      employe = await prisma.user.findUnique({
        where: { id: CONFIG.employeTestId }
      });
    }
    
    if (!employe) {
      employe = await prisma.user.findFirst({
        where: { role: 'employee', statut: 'actif' },
        orderBy: { id: 'asc' }
      });
    }
    
    if (!employe) {
      console.log('❌ Aucun employé trouvé dans la base !');
      return;
    }
    
    console.log(`   ✅ Employé sélectionné: ${employe.prenom} ${employe.nom} (ID: ${employe.id})`);
    console.log(`   📧 Email: ${employe.email}`);
    
    // 2. Nettoyer les anciennes anomalies de test
    if (CONFIG.cleanupBefore) {
      console.log('\n🧹 Étape 2: Nettoyage des anomalies de test précédentes...');
      
      const deleted = await prisma.anomalie.deleteMany({
        where: {
          description: { contains: CONFIG.testPrefix }
        }
      });
      
      console.log(`   🗑️  ${deleted.count} anomalies de test supprimées`);
    }
    
    // 3. Créer les anomalies de test
    console.log('\n📝 Étape 3: Création des anomalies de test...\n');
    
    const anomaliesACreer = [];
    const scenarioKeys = Object.keys(SCENARIOS);
    
    // Aujourd'hui - anomalies variées pour le widget
    console.log('   📅 AUJOURD\'HUI (pour le widget Pointage.jsx):');
    const todayScenarios = ['retard_modere', 'heures_sup_a_valider', 'depart_anticipe'];
    
    for (const key of todayScenarios) {
      const scenario = SCENARIOS[key];
      const statut = 'en_attente'; // Aujourd'hui = toujours en attente
      
      anomaliesACreer.push({
        employeId: employe.id,
        date: getDateRelative(0),
        type: scenario.type,
        gravite: scenario.gravite,
        description: `${CONFIG.testPrefix} ${scenario.description}`,
        details: scenario.details,
        statut,
        heuresExtra: scenario.heuresExtra || null,
        montantExtra: scenario.montantExtra || null
      });
      
      const emoji = scenario.gravite === 'critique' ? '🔴' :
                   scenario.gravite === 'attention' ? '🟡' :
                   scenario.gravite === 'a_valider' ? '🟠' :
                   scenario.gravite === 'hors_plage' ? '🟣' : '🟢';
      console.log(`      ${emoji} ${scenario.type} - ${statut}`);
    }
    
    // Hier - mix de statuts
    console.log('\n   📅 HIER (historique récent):');
    const yesterdayScenarios = ['retard_critique', 'missing_arrivee', 'heures_sup_validees'];
    
    for (const key of yesterdayScenarios) {
      const scenario = SCENARIOS[key];
      const statut = getRandomStatut();
      
      anomaliesACreer.push({
        employeId: employe.id,
        date: getDateRelative(-1),
        type: scenario.type,
        gravite: scenario.gravite,
        description: `${CONFIG.testPrefix} ${scenario.description}`,
        details: scenario.details,
        statut,
        heuresExtra: scenario.heuresExtra || null,
        montantExtra: scenario.montantExtra || null,
        commentaireManager: statut !== 'en_attente' ? 'Vu et traité par le manager' : null,
        traiteAt: statut !== 'en_attente' ? new Date() : null
      });
      
      const emoji = scenario.gravite === 'critique' ? '🔴' :
                   scenario.gravite === 'attention' ? '🟡' :
                   scenario.gravite === 'a_valider' ? '🟠' :
                   scenario.gravite === 'hors_plage' ? '🟣' : '🟢';
      console.log(`      ${emoji} ${scenario.type} - ${statut}`);
    }
    
    // Semaine passée - plus de variété
    console.log('\n   📅 SEMAINE PASSÉE (historique):');
    const weekScenarios = ['retard_leger', 'hors_plage_arrivee', 'presence_non_prevue', 'depart_premature'];
    
    for (let i = 0; i < weekScenarios.length; i++) {
      const key = weekScenarios[i];
      const scenario = SCENARIOS[key];
      const statut = getRandomStatut();
      const dayOffset = -(2 + i); // -2, -3, -4, -5
      
      anomaliesACreer.push({
        employeId: employe.id,
        date: getDateRelative(dayOffset),
        type: scenario.type,
        gravite: scenario.gravite,
        description: `${CONFIG.testPrefix} ${scenario.description}`,
        details: scenario.details,
        statut,
        heuresExtra: scenario.heuresExtra || null,
        montantExtra: scenario.montantExtra || null,
        justificationEmploye: Math.random() > 0.5 ? 'Circonstances exceptionnelles' : null,
        commentaireManager: statut !== 'en_attente' ? 'Traité après vérification' : null,
        traiteAt: statut !== 'en_attente' ? new Date() : null
      });
      
      const emoji = scenario.gravite === 'critique' ? '🔴' :
                   scenario.gravite === 'attention' ? '🟡' :
                   scenario.gravite === 'a_valider' ? '🟠' :
                   scenario.gravite === 'hors_plage' ? '🟣' : '🟢';
      console.log(`      ${emoji} ${scenario.type} - ${statut} (J${dayOffset})`);
    }
    
    // Mois passé - quelques-unes
    console.log('\n   📅 MOIS PASSÉ (historique long):');
    const monthScenarios = ['missing_depart', 'absence_avec_pointage'];
    
    for (let i = 0; i < monthScenarios.length; i++) {
      const key = monthScenarios[i];
      const scenario = SCENARIOS[key];
      const statut = Math.random() > 0.3 ? 'validee' : 'refusee'; // Anciennes = traitées
      const dayOffset = -(15 + i * 5);
      
      anomaliesACreer.push({
        employeId: employe.id,
        date: getDateRelative(dayOffset),
        type: scenario.type,
        gravite: scenario.gravite,
        description: `${CONFIG.testPrefix} ${scenario.description}`,
        details: scenario.details,
        statut,
        heuresExtra: scenario.heuresExtra || null,
        montantExtra: scenario.montantExtra || null,
        commentaireManager: 'Traité et archivé',
        traiteAt: new Date()
      });
      
      const emoji = scenario.gravite === 'critique' ? '🔴' :
                   scenario.gravite === 'attention' ? '🟡' :
                   scenario.gravite === 'a_valider' ? '🟠' :
                   scenario.gravite === 'hors_plage' ? '🟣' : '🟢';
      console.log(`      ${emoji} ${scenario.type} - ${statut} (J${dayOffset})`);
    }
    
    // 4. Insérer en base
    console.log('\n💾 Étape 4: Insertion en base de données...');
    
    let created = 0;
    let errors = 0;
    
    for (const data of anomaliesACreer) {
      try {
        await prisma.anomalie.create({ data });
        created++;
      } catch (err) {
        // Ignorer les doublons
        if (err.code === 'P2002') {
          console.log(`   ⚠️  Doublon ignoré: ${data.type} du ${formatDate(data.date)}`);
        } else {
          console.error(`   ❌ Erreur: ${err.message}`);
          errors++;
        }
      }
    }
    
    console.log(`   ✅ ${created} anomalies créées`);
    if (errors > 0) console.log(`   ⚠️  ${errors} erreurs`);
    
    // 5. Vérification
    console.log('\n📊 Étape 5: Vérification...');
    
    const stats = await prisma.anomalie.groupBy({
      by: ['statut'],
      where: { employeId: employe.id },
      _count: true
    });
    
    console.log('\n   Répartition par statut:');
    stats.forEach(s => {
      const emoji = s.statut === 'en_attente' ? '🔵' :
                   s.statut === 'validee' ? '✅' :
                   s.statut === 'refusee' ? '❌' :
                   s.statut === 'corrigee' ? '🔧' : '⚪';
      console.log(`      ${emoji} ${s.statut.padEnd(12)}: ${s._count}`);
    });
    
    const todayCount = await prisma.anomalie.count({
      where: {
        employeId: employe.id,
        date: {
          gte: getDateRelative(0),
          lt: getDateRelative(1)
        },
        statut: { not: 'obsolete' }
      }
    });
    
    console.log(`\n   🎯 Anomalies affichables aujourd'hui: ${todayCount}`);
    
    // 6. Instructions de test
    console.log('\n' + '═'.repeat(70));
    console.log('✅ DONNÉES DE TEST CRÉÉES !');
    console.log('═'.repeat(70));
    
    console.log(`
📱 POUR TESTER:

1. Connectez-vous avec: ${employe.email}
   (mot de passe par défaut: password123 ou celui configuré)

2. Allez sur la page POINTAGE:
   → Vous devriez voir le widget "Anomalies du jour" avec ${todayCount} anomalie(s)
   → Types attendus: retard modéré, heures sup à valider, départ anticipé

3. Cliquez sur "Voir tout mon historique":
   → Vous arrivez sur /mes-anomalies
   → Filtrez par période (7 jours, 30 jours, 3 mois)
   → Filtrez par statut (en attente, validées, etc.)

4. Vérifiez la SÉCURITÉ:
   → L'employé ne doit voir QUE ses propres anomalies
   → Connectez-vous avec un autre compte pour vérifier

📋 ANOMALIES CRÉÉES:
`);
    
    // Liste des anomalies créées
    const allAnomalies = await prisma.anomalie.findMany({
      where: { 
        employeId: employe.id,
        description: { contains: CONFIG.testPrefix }
      },
      orderBy: { date: 'desc' }
    });
    
    console.log('   Date        | Type                    | Gravité    | Statut');
    console.log('   ' + '-'.repeat(70));
    
    allAnomalies.forEach(a => {
      const dateStr = formatDate(a.date).padEnd(11);
      const typeStr = a.type.padEnd(23);
      const graviteStr = a.gravite.padEnd(10);
      console.log(`   ${dateStr} | ${typeStr} | ${graviteStr} | ${a.statut}`);
    });
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
main();
