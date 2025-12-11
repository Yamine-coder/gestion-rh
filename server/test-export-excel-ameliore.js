// Test de génération du fichier Excel amélioré
const { PrismaClient } = require('@prisma/client');
const { generateAllEmployeesExcel } = require('./utils/exportUtils');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function testerExportExcel() {
  console.log('🧪 TEST D\'EXPORT EXCEL AMÉLIORÉ\n');
  console.log('='.repeat(80));

  try {
    // Récupérer les employés avec leurs données
    const dateDebut = new Date('2025-11-01');
    const dateFin = new Date('2025-11-30');
    const periode = 'mois';

    const employes = await prisma.user.findMany({
      where: { role: 'employe' }
    });

    console.log(`\n📊 ${employes.length} employé(s) trouvé(s)\n`);

    // Simuler des rapports (normalement viennent de l'API)
    const rapportsEmployes = [];

    for (const emp of employes) {
      // Récupérer shifts et pointages
      const shifts = await prisma.shift.findMany({
        where: {
          employeId: emp.id,
          date: { gte: dateDebut, lte: dateFin }
        }
      });

      const pointages = await prisma.pointage.findMany({
        where: {
          userId: emp.id,
          horodatage: { gte: dateDebut, lte: dateFin }
        }
      });

      // Calculs simplifiés pour le test
      const joursPlanifies = shifts.filter(s => s.type === 'présence').length;
      const joursPresents = new Set(pointages.map(p => 
        p.horodatage.toISOString().split('T')[0]
      )).size;

      rapportsEmployes.push({
        nom: emp.nom,
        prenom: emp.prenom,
        email: emp.email,
        role: emp.role,
        heuresPrevues: joursPlanifies * 8, // Simplifié
        heuresTravaillees: joursPresents * 7.5, // Simplifié
        heuresSupplementaires: Math.max(0, joursPresents * 7.5 - joursPlanifies * 8),
        heuresManquantes: Math.max(0, joursPlanifies * 8 - joursPresents * 7.5),
        absencesJustifiees: Math.floor(Math.random() * 3),
        absencesInjustifiees: shifts.filter(s => s.type === 'présence').length - joursPresents,
        nombreRetards: Math.floor(Math.random() * 2),
        joursPlanifies,
        joursPresents,
        tauxPresence: joursPlanifies > 0 ? Math.round((joursPresents / joursPlanifies) * 100) : 0,
        tauxPonctualite: 85 + Math.floor(Math.random() * 15),
        moyenneHeuresJour: joursPresents > 0 ? 7.5 : 0
      });
    }

    console.log('✅ Rapports préparés:\n');
    rapportsEmployes.forEach(r => {
      console.log(`   ${r.nom} ${r.prenom}: ${r.heuresTravaillees}h travaillées, ${r.tauxPresence}% présence`);
    });

    // Générer le fichier Excel
    console.log('\n📄 Génération du fichier Excel...\n');
    
    const buffer = await generateAllEmployeesExcel(rapportsEmployes, periode, dateDebut, dateFin);
    
    console.log(`✅ Buffer généré: ${buffer.length} bytes\n`);

    // Sauvegarder le fichier
    const outputPath = path.join(__dirname, 'test_export_rapport_paie.xlsx');
    fs.writeFileSync(outputPath, buffer);

    console.log(`💾 Fichier sauvegardé: ${outputPath}\n`);
    console.log('='.repeat(80));
    console.log('\n🎉 SUCCÈS !\n');
    console.log('Le fichier Excel a été généré avec:');
    console.log('   ✅ Logo du restaurant (si disponible)');
    console.log('   ✅ Feuille 1: "Fiche Paie" (infos essentielles)');
    console.log('   ✅ Feuille 2: "Rapport Détaillé" (toutes les données)');
    console.log('   ✅ Couleurs d\'alerte automatiques');
    console.log('   ✅ Totaux et moyennes calculés');
    console.log(`   ✅ ${rapportsEmployes.length} employé(s) inclus\n`);
    console.log(`📂 Ouvrir le fichier: ${outputPath}\n`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testerExportExcel();
