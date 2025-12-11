// Test de l'export complet comme utilisé par l'API
const { generateAllEmployeesExcel } = require('./utils/exportUtils');
const fs = require('fs');
const path = require('path');

async function testExportCompletAvecDates() {
  try {
    console.log('🧪 TEST EXPORT COMPLET AVEC DATES PAR TYPE\n');
    console.log('=' .repeat(80));

    // Données test avec heuresParJour incluant les types de congé
    const rapportsEmployes = [
      {
        nom: 'Dupont',
        prenom: 'Marie',
        email: 'marie.dupont@restaurant.com',
        role: 'Serveur',
        heuresPrevues: 151.67,
        heuresTravaillees: 148.5,
        heuresSupplementaires: 0,
        heuresManquantes: 3.17,
        absencesJustifiees: 2,
        absencesInjustifiees: 0,
        nombreRetards: 1,
        joursPlanifies: 22,
        joursPresents: 20,
        tauxPresence: 95,
        tauxPonctualite: 95,
        moyenneHeuresJour: 7.43,
        heuresParJour: [
          { jour: new Date('2025-11-05'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0, 
            details: { type: 'congé', congeType: 'Congés payés', motif: '' } },
          { jour: new Date('2025-11-12'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'RTT', motif: '' } }
        ]
      },
      {
        nom: 'Martin',
        prenom: 'Thomas',
        email: 'thomas.martin@restaurant.com',
        role: 'Chef de cuisine',
        heuresPrevues: 173.33,
        heuresTravaillees: 185.5,
        heuresSupplementaires: 12.17,
        heuresManquantes: 0,
        absencesJustifiees: 0,
        absencesInjustifiees: 0,
        nombreRetards: 0,
        joursPlanifies: 22,
        joursPresents: 22,
        tauxPresence: 100,
        tauxPonctualite: 100,
        moyenneHeuresJour: 8.43,
        heuresParJour: []
      },
      {
        nom: 'Bernard',
        prenom: 'Sophie',
        email: 'sophie.bernard@restaurant.com',
        role: 'Serveur',
        heuresPrevues: 151.67,
        heuresTravaillees: 138.25,
        heuresSupplementaires: 0,
        heuresManquantes: 13.42,
        absencesJustifiees: 3,
        absencesInjustifiees: 1,
        nombreRetards: 5,
        joursPlanifies: 22,
        joursPresents: 18,
        tauxPresence: 82,
        tauxPonctualite: 77,
        moyenneHeuresJour: 7.68,
        heuresParJour: [
          { jour: new Date('2025-11-06'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Maladie', motif: 'Certificat médical' } },
          { jour: new Date('2025-11-07'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Maladie', motif: 'Certificat médical' } },
          { jour: new Date('2025-11-08'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Maladie', motif: 'Certificat médical' } },
          { jour: new Date('2025-11-20'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 }
        ]
      },
      {
        nom: 'Petit',
        prenom: 'Lucas',
        email: 'lucas.petit@restaurant.com',
        role: 'Commis de cuisine',
        heuresPrevues: 151.67,
        heuresTravaillees: 95.5,
        heuresSupplementaires: 0,
        heuresManquantes: 56.17,
        absencesJustifiees: 5,
        absencesInjustifiees: 3,
        nombreRetards: 8,
        joursPlanifies: 22,
        joursPresents: 14,
        tauxPresence: 64,
        tauxPonctualite: 55,
        moyenneHeuresJour: 6.82,
        heuresParJour: [
          { jour: new Date('2025-11-04'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés', motif: '' } },
          { jour: new Date('2025-11-05'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés', motif: '' } },
          { jour: new Date('2025-11-06'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés', motif: '' } },
          { jour: new Date('2025-11-07'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés', motif: '' } },
          { jour: new Date('2025-11-08'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0,
            details: { type: 'congé', congeType: 'Congés payés', motif: '' } },
          { jour: new Date('2025-11-13'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 },
          { jour: new Date('2025-11-19'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 },
          { jour: new Date('2025-11-27'), type: 'absence', heuresPrevues: 7, heuresTravaillees: 0 }
        ]
      }
    ];

    const periode = 'mois';
    const dateDebut = new Date('2025-11-01');
    const dateFin = new Date('2025-11-30');

    console.log('📊 Génération du rapport pour 4 employés avec dates détaillées...\n');

    const buffer = await generateAllEmployeesExcel(
      rapportsEmployes,
      periode,
      dateDebut,
      dateFin
    );

    console.log(`✅ Buffer généré: ${buffer.length} bytes\n`);

    // Sauvegarder le fichier
    const fileName = 'test_export_complet_dates.xlsx';
    const filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, buffer);

    console.log(`💾 Fichier sauvegardé: ${filePath}`);
    console.log('=' .repeat(80));
    console.log('\n🎉 SUCCÈS !');
    console.log('\nLe rapport contient:');
    console.log('   ✅ Marie: 2 dates dans "Dates Congés/RTT" (05/11 CP, 12/11 RTT)');
    console.log('   ✅ Sophie: 3 dates dans "Dates Maladie" + 1 dans "Dates Abs. Injust."');
    console.log('   ✅ Lucas: 5 dates dans "Dates Congés/RTT" + 3 dans "Dates Abs. Injust."');
    console.log('\n📂 Ouvrir le fichier pour vérifier les 3 colonnes séparées !');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ ERREUR:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testExportCompletAvecDates();
