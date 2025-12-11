const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateRapportTousEmployes } = require('./utils/exportUtils');
const ExcelJS = require('exceljs');
const path = require('path');

async function testerExport() {
  console.log('\n🧪 TEST DE L\'EXPORT EXCEL\n');
  console.log('=' .repeat(60));

  try {
    const now = new Date();
    
    // 1. Compter les employés actifs
    const employesActifs = await prisma.user.findMany({
      where: {
        role: 'employee',
        statut: 'actif',
        OR: [
          { dateSortie: null },
          { dateSortie: { gt: now } }
        ]
      }
    });

    console.log(`\n✅ ${employesActifs.length} employés actifs en base`);

    // 2. Simuler l'export
    console.log('\n📊 Génération du rapport d\'export...');
    
    const dateDebut = new Date('2025-11-01');
    const dateFin = new Date('2025-11-30T23:59:59');
    
    // Récupérer les employés comme le fait statsRoutes.js
    const employes = await prisma.user.findMany({
      where: {
        role: { not: 'admin' },
        statut: 'actif',
        OR: [
          { dateSortie: null },
          { dateSortie: { gt: dateFin } }
        ]
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        statut: true,
        dateSortie: true
      }
    });

    console.log(`✅ ${employes.length} employés retournés par la requête d'export`);
    
    // 3. Générer le fichier
    const workbook = await generateRapportTousEmployes(dateDebut, dateFin);
    const worksheet = workbook.getWorksheet('Rapport heures');
    
    // Compter les lignes (sans l'en-tête)
    const nbLignes = worksheet.rowCount - 2; // -1 pour l'en-tête, -1 pour le total
    
    console.log(`✅ ${nbLignes} lignes dans le fichier Excel (hors en-tête)`);
    
    // 4. Validation
    console.log('\n🎯 VALIDATION:');
    if (nbLignes === employesActifs.length) {
      console.log(`   ✅ CORRECT: ${nbLignes} lignes = ${employesActifs.length} employés actifs`);
    } else {
      console.log(`   ❌ ERREUR: ${nbLignes} lignes ≠ ${employesActifs.length} employés actifs`);
    }
    
    // 5. Vérifier les colonnes
    console.log('\n📋 VÉRIFICATION DES COLONNES:');
    const headerRow = worksheet.getRow(1);
    const colonnesAttendues = [
      'Employé',
      'Email',
      'Heures prévues',
      'Heures travaillées',
      'Heures supplémentaires',
      'Heures manquantes',
      'Jours travaillés',
      'Jours planifiés',
      'Absences justifiées',
      'Congés Payés',
      'RTT',
      'Maladie',
      'Absences injustifiées',
      'Retards (nb)',
      'Retards (heures)',
      'Taux de présence',
      'Taux de ponctualité',
      'Pointage correct',
      'Anomalies actives',
      'Dates CP',
      'Dates RTT',
      'Dates Maladie'
    ];
    
    let toutesColonnesPresentes = true;
    colonnesAttendues.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      if (cell.value === col) {
        console.log(`   ✅ Colonne ${index + 1}: ${col}`);
      } else {
        console.log(`   ❌ Colonne ${index + 1}: Attendue "${col}", trouvée "${cell.value}"`);
        toutesColonnesPresentes = false;
      }
    });
    
    if (toutesColonnesPresentes) {
      console.log('\n   ✅ Toutes les colonnes sont présentes et correctes');
    } else {
      console.log('\n   ❌ Certaines colonnes manquent ou sont incorrectes');
    }
    
    // 6. Sauvegarder pour inspection manuelle
    const outputPath = path.join(__dirname, '..', 'test-export-validation.xlsx');
    await workbook.xlsx.writeFile(outputPath);
    console.log(`\n💾 Fichier sauvegardé: ${outputPath}`);
    console.log('   Ouvrir ce fichier pour vérification manuelle');
    
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testerExport();
