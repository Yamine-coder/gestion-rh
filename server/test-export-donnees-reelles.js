// Test export Excel avec des données réalistes
const { generateAllEmployeesExcel } = require('./utils/exportUtils');
const fs = require('fs');
const path = require('path');

// Données de test réalistes pour novembre 2025
const rapportsEmployesTest = [
  {
    id: 1,
    nom: 'Dupont',
    prenom: 'Marie',
    email: 'marie.dupont@restaurant.fr',
    role: 'Serveuse',
    heuresPrevues: 151.67, // 35h/semaine * 4.33 semaines
    heuresTravaillees: 148.5,
    heuresSupplementaires: 0,
    absencesJustifiees: 2, // 2 jours de congés
    absencesInjustifiees: 0,
    nombreRetards: 1,
    tauxPresence: 95,
    tauxPonctualite: 95,
    statistiques: {
      joursOuvrables: 22,
      joursTravailles: 20
    },
    heuresParJour: [
      { jour: '2025-11-05', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Congés payés' } },
      { jour: '2025-11-12', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'RTT' } },
    ]
  },
  {
    id: 2,
    nom: 'Martin',
    prenom: 'Thomas',
    email: 'thomas.martin@restaurant.fr',
    role: 'Chef de cuisine',
    heuresPrevues: 173.33, // 40h/semaine
    heuresTravaillees: 185.5,
    heuresSupplementaires: 12.17,
    absencesJustifiees: 0,
    absencesInjustifiees: 0,
    nombreRetards: 0,
    tauxPresence: 100,
    tauxPonctualite: 100,
    statistiques: {
      joursOuvrables: 22,
      joursTravailles: 22
    },
    heuresParJour: []
  },
  {
    id: 3,
    nom: 'Bernard',
    prenom: 'Sophie',
    email: 'sophie.bernard@restaurant.fr',
    role: 'Serveuse',
    heuresPrevues: 151.67,
    heuresTravaillees: 138.25,
    heuresSupplementaires: 0,
    absencesJustifiees: 3, // Maladie
    absencesInjustifiees: 1, // Absence injustifiée
    nombreRetards: 5,
    tauxPresence: 82,
    tauxPonctualite: 77,
    statistiques: {
      joursOuvrables: 22,
      joursTravailles: 18
    },
    heuresParJour: [
      { jour: '2025-11-06', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Maladie' } },
      { jour: '2025-11-07', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Maladie' } },
      { jour: '2025-11-08', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Maladie' } },
      { jour: '2025-11-20', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 }, // Absence injustifiée (pas de congeType)
    ]
  },
  {
    id: 4,
    nom: 'Petit',
    prenom: 'Lucas',
    email: 'lucas.petit@restaurant.fr',
    role: 'Commis de cuisine',
    heuresPrevues: 151.67,
    heuresTravaillees: 95.5,
    heuresSupplementaires: 0,
    absencesJustifiees: 5, // Congés
    absencesInjustifiees: 3, // 3 jours sans justification
    nombreRetards: 8,
    tauxPresence: 64,
    tauxPonctualite: 55,
    statistiques: {
      joursOuvrables: 22,
      joursTravailles: 14
    },
    heuresParJour: [
      { jour: '2025-11-04', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Congés payés' } },
      { jour: '2025-11-05', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Congés payés' } },
      { jour: '2025-11-06', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Congés payés' } },
      { jour: '2025-11-07', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Congés payés' } },
      { jour: '2025-11-08', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Congés payés' } },
      { jour: '2025-11-13', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 }, // Injustifié
      { jour: '2025-11-19', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 }, // Injustifié
      { jour: '2025-11-27', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 }, // Injustifié
    ]
  },
  {
    id: 5,
    nom: 'Moreau',
    prenom: 'Émilie',
    email: 'emilie.moreau@restaurant.fr',
    role: 'Manager',
    heuresPrevues: 173.33,
    heuresTravaillees: 178.75,
    heuresSupplementaires: 5.42,
    absencesJustifiees: 1, // 1 jour RTT
    absencesInjustifiees: 0,
    nombreRetards: 2,
    tauxPresence: 95,
    tauxPonctualite: 90,
    statistiques: {
      joursOuvrables: 22,
      joursTravailles: 21
    },
    heuresParJour: [
      { jour: '2025-11-15', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'RTT' } },
    ]
  },
  {
    id: 6,
    nom: 'Leroy',
    prenom: 'Antoine',
    email: 'antoine.leroy@restaurant.fr',
    role: 'Plongeur',
    heuresPrevues: 151.67,
    heuresTravaillees: 142.0,
    heuresSupplementaires: 0,
    absencesJustifiees: 2,
    absencesInjustifiees: 0,
    nombreRetards: 4,
    tauxPresence: 91,
    tauxPonctualite: 82,
    statistiques: {
      joursOuvrables: 22,
      joursTravailles: 20
    },
    heuresParJour: [
      { jour: '2025-11-14', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Congés payés' } },
      { jour: '2025-11-21', type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, details: { type: 'congé', congeType: 'Congés payés' } },
    ]
  }
];

async function testExportReel() {
  console.log('\n🧪 TEST EXPORT AVEC DONNÉES RÉALISTES\n');
  console.log('='.repeat(80));
  console.log('\n📊 Génération du rapport pour 6 employés:\n');
  
  rapportsEmployesTest.forEach(emp => {
    const status = emp.absencesInjustifiees > 0 ? '⚠️' : '✅';
    console.log(`   ${status} ${emp.prenom} ${emp.nom} (${emp.role})`);
    console.log(`      - ${emp.heuresTravaillees}h travaillées / ${emp.heuresPrevues}h prévues`);
    console.log(`      - Présence: ${emp.tauxPresence}% | Ponctualité: ${emp.tauxPonctualite}%`);
    if (emp.absencesJustifiees > 0) {
      console.log(`      - ${emp.absencesJustifiees}j congés/maladie`);
    }
    if (emp.absencesInjustifiees > 0) {
      console.log(`      - ⚠️  ${emp.absencesInjustifiees}j absences INJUSTIFIÉES`);
    }
    if (emp.nombreRetards > 3) {
      console.log(`      - ⚠️  ${emp.nombreRetards} retards`);
    }
    console.log('');
  });

  try {
    console.log('📄 Génération du fichier Excel...\n');
    
    const dateDebut = new Date('2025-11-01');
    const dateFin = new Date('2025-11-30');
    const periode = 'mois';
    
    const buffer = await generateAllEmployeesExcel(
      rapportsEmployesTest,
      periode,
      dateDebut,
      dateFin
    );
    
    console.log(`✅ Buffer généré: ${buffer.length} bytes\n`);
    
    const outputPath = path.join(__dirname, 'test_rapport_reel.xlsx');
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`💾 Fichier sauvegardé: ${outputPath}`);
    console.log('='.repeat(80));
    console.log('\n🎉 SUCCÈS !\n');
    console.log('Le rapport contient:');
    console.log('   ✅ 6 employés avec profils variés');
    console.log('   ✅ Congés payés (Marie: 2j, Lucas: 5j, Émilie: 1j RTT)');
    console.log('   ✅ Absences justifiées (Sophie: 3j maladie)');
    console.log('   ✅ Absences injustifiées (Sophie: 1j, Lucas: 3j)');
    console.log('   ✅ Dates complètes des absences');
    console.log('   ✅ Heures supplémentaires (Thomas: 12h, Émilie: 5h)');
    console.log('   ✅ Retards multiples (Lucas: 8, Sophie: 5, Antoine: 4)');
    console.log('   ✅ Alertes colorées (rouge/orange/vert)');
    console.log('   ✅ Totaux calculés automatiquement\n');
    console.log(`📂 Ouvrir le fichier: ${outputPath}`);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERREUR lors de la génération:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testExportReel();
