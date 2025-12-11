// Test export paie avec données réalistes variées
const { generateAllEmployeesExcel } = require('./utils/exportUtils');
const fs = require('fs');
const path = require('path');

async function testExportPaie() {
  try {
    console.log('🧪 TEST EXPORT PAIE AVEC DONNÉES VARIÉES\n');
    console.log('='.repeat(80));

    // Données réalistes avec tous les cas de figure
    const rapportsEmployes = [
      // 1. Employé parfait - Aucun problème
      {
        nom: 'Dupont',
        prenom: 'Marie',
        email: 'marie.dupont@restaurant.com',
        role: 'Serveuse',
        heuresPrevues: 151.67,
        heuresTravaillees: 158.5,
        heuresSupplementaires: 6.83,
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
      
      // 2. Employé avec congés payés
      {
        nom: 'Martin',
        prenom: 'Thomas',
        email: 'thomas.martin@restaurant.com',
        role: 'Chef de cuisine',
        heuresPrevues: 173.33,
        heuresTravaillees: 148.5,
        heuresSupplementaires: 0,
        absencesJustifiees: 3,
        absencesInjustifiees: 0,
        nombreRetards: 0,
        tauxPresence: 86,
        tauxPonctualite: 100,
        statistiques: {
          joursOuvrables: 22,
          joursTravailles: 19
        },
        heuresParJour: [
          { jour: new Date('2025-11-18'), type: 'absence', heuresPrevues: 8, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés' } },
          { jour: new Date('2025-11-19'), type: 'absence', heuresPrevues: 8, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés' } },
          { jour: new Date('2025-11-20'), type: 'absence', heuresPrevues: 8, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés' } }
        ]
      },

      // 3. Employé avec RTT
      {
        nom: 'Bernard',
        prenom: 'Sophie',
        email: 'sophie.bernard@restaurant.com',
        role: 'Manager',
        heuresPrevues: 173.33,
        heuresTravaillees: 157.5,
        heuresSupplementaires: 0,
        absencesJustifiees: 2,
        absencesInjustifiees: 0,
        nombreRetards: 1,
        tauxPresence: 91,
        tauxPonctualite: 95,
        statistiques: {
          joursOuvrables: 22,
          joursTravailles: 20
        },
        heuresParJour: [
          { jour: new Date('2025-11-06'), type: 'absence', heuresPrevues: 8, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'RTT' } },
          { jour: new Date('2025-11-13'), type: 'absence', heuresPrevues: 8, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'RTT' } }
        ]
      },

      // 4. Employé avec arrêt maladie
      {
        nom: 'Petit',
        prenom: 'Lucas',
        email: 'lucas.petit@restaurant.com',
        role: 'Commis de cuisine',
        heuresPrevues: 151.67,
        heuresTravaillees: 123.5,
        heuresSupplementaires: 0,
        absencesJustifiees: 4,
        absencesInjustifiees: 0,
        nombreRetards: 0,
        tauxPresence: 82,
        tauxPonctualite: 100,
        statistiques: {
          joursOuvrables: 22,
          joursTravailles: 18
        },
        heuresParJour: [
          { jour: new Date('2025-11-11'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Maladie' } },
          { jour: new Date('2025-11-12'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Maladie' } },
          { jour: new Date('2025-11-13'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Maladie' } },
          { jour: new Date('2025-11-14'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Maladie' } }
        ]
      },

      // 5. Employé avec ABSENCES INJUSTIFIÉES (ALERTE ROUGE)
      {
        nom: 'Garcia',
        prenom: 'Léa',
        email: 'lea.garcia@restaurant.com',
        role: 'Serveuse',
        heuresPrevues: 151.67,
        heuresTravaillees: 130.25,
        heuresSupplementaires: 0,
        absencesJustifiees: 0,
        absencesInjustifiees: 3,
        nombreRetards: 5,
        tauxPresence: 86,
        tauxPonctualite: 75,
        statistiques: {
          joursOuvrables: 22,
          joursTravailles: 19
        },
        heuresParJour: [
          { jour: new Date('2025-11-07'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 },
          { jour: new Date('2025-11-15'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 },
          { jour: new Date('2025-11-22'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 }
        ]
      },

      // 6. Employé avec beaucoup d'heures supp
      {
        nom: 'Moreau',
        prenom: 'Émilie',
        email: 'emilie.moreau@restaurant.com',
        role: 'Chef de rang',
        heuresPrevues: 151.67,
        heuresTravaillees: 169.5,
        heuresSupplementaires: 17.83,
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

      // 7. Employé avec mix CP + Maladie
      {
        nom: 'Laurent',
        prenom: 'Antoine',
        email: 'antoine.laurent@restaurant.com',
        role: 'Plongeur',
        heuresPrevues: 151.67,
        heuresTravaillees: 123.5,
        heuresSupplementaires: 0,
        absencesJustifiees: 5,
        absencesInjustifiees: 0,
        nombreRetards: 2,
        tauxPresence: 77,
        tauxPonctualite: 90,
        statistiques: {
          joursOuvrables: 22,
          joursTravailles: 17
        },
        heuresParJour: [
          { jour: new Date('2025-11-04'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés' } },
          { jour: new Date('2025-11-05'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés' } },
          { jour: new Date('2025-11-18'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Maladie' } },
          { jour: new Date('2025-11-19'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Maladie' } },
          { jour: new Date('2025-11-20'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Maladie' } }
        ]
      },

      // 8. Employé problématique - Abs. injust. + Retards
      {
        nom: 'David',
        prenom: 'Hugo',
        email: 'hugo.david@restaurant.com',
        role: 'Commis de cuisine',
        heuresPrevues: 151.67,
        heuresTravaillees: 102.75,
        heuresSupplementaires: 0,
        absencesJustifiees: 1,
        absencesInjustifiees: 5,
        nombreRetards: 8,
        tauxPresence: 68,
        tauxPonctualite: 60,
        statistiques: {
          joursOuvrables: 22,
          joursTravailles: 15
        },
        heuresParJour: [
          { jour: new Date('2025-11-05'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'RTT' } },
          { jour: new Date('2025-11-08'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 },
          { jour: new Date('2025-11-12'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 },
          { jour: new Date('2025-11-15'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 },
          { jour: new Date('2025-11-21'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 },
          { jour: new Date('2025-11-26'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 }
        ]
      },

      // 9. Employé avec CP + RTT combinés
      {
        nom: 'Simon',
        prenom: 'Emma',
        email: 'emma.simon@restaurant.com',
        role: 'Serveuse',
        heuresPrevues: 151.67,
        heuresTravaillees: 130.5,
        heuresSupplementaires: 2.5,
        absencesJustifiees: 4,
        absencesInjustifiees: 0,
        nombreRetards: 1,
        tauxPresence: 82,
        tauxPonctualite: 95,
        statistiques: {
          joursOuvrables: 22,
          joursTravailles: 18
        },
        heuresParJour: [
          { jour: new Date('2025-11-07'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés' } },
          { jour: new Date('2025-11-08'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés' } },
          { jour: new Date('2025-11-14'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'RTT' } },
          { jour: new Date('2025-11-28'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'RTT' } }
        ]
      },

      // 10. Employé temps partiel avec heures normales
      {
        nom: 'Robert',
        prenom: 'Claire',
        email: 'claire.robert@restaurant.com',
        role: 'Aide de cuisine',
        heuresPrevues: 87.5,
        heuresTravaillees: 89.25,
        heuresSupplementaires: 1.75,
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
      }
    ];

    const periode = 'mois';
    const dateDebut = new Date('2025-11-01');
    const dateFin = new Date('2025-11-30');

    console.log('📊 Génération du rapport PAIE pour 10 employés variés:\n');
    console.log('   ✅ 1 employé parfait (Marie)');
    console.log('   ✅ 3 avec congés payés (Thomas, Antoine, Emma)');
    console.log('   ✅ 3 avec RTT (Sophie, Hugo, Emma)');
    console.log('   ✅ 2 avec maladie (Lucas, Antoine)');
    console.log('   🔴 2 avec absences INJUSTIFIÉES (Léa: 3j, Hugo: 5j)');
    console.log('   🟢 2 avec beaucoup d\'heures supp (Émilie: 17.8h, Marie: 6.8h)');
    console.log('   ⏰ 1 temps partiel (Claire)\n');

    const buffer = await generateAllEmployeesExcel(
      rapportsEmployes,
      periode,
      dateDebut,
      dateFin
    );

    console.log(`✅ Excel généré: ${buffer.length} bytes\n`);

    const fileName = 'test_export_paie_complet.xlsx';
    const filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, buffer);

    console.log(`💾 Fichier sauvegardé: ${filePath}`);
    console.log('='.repeat(80));
    console.log('\n🎉 SUCCÈS ! Vérifier le fichier Excel:\n');
    console.log('📋 COLONNES À VÉRIFIER:');
    console.log('   • Nom, Email, Rôle (identité)');
    console.log('   • H. Normales vs H. Supp (séparées)');
    console.log('   • H. Manquantes (pour déductions)');
    console.log('   • CP, RTT, Maladie (compteurs séparés)');
    console.log('   • Dates CP, Dates RTT, Dates Maladie (détail)');
    console.log('   • 🔴 Dates Abs. Injust. (en rouge pour Léa et Hugo)');
    console.log('   • Colonne Observations (vide, pour notes)');
    console.log('\n🎨 COLORATIONS:');
    console.log('   • 🟢 Vert = Heures supp > 10h (Émilie)');
    console.log('   • 🟠 Orange = Heures manquantes');
    console.log('   • 🔴 Rouge = Absences injustifiées (Léa, Hugo)');
    console.log('   • ⚠️  Jaune = Si heures > 220h/mois');
    console.log('\n✨ FONCTIONNALITÉS:');
    console.log('   • Filtres automatiques activés sur toutes colonnes');
    console.log('   • Volets figés (en-têtes + nom)');
    console.log('   • Totaux en bas');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ ERREUR:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testExportPaie();
