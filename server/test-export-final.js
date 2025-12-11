const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateAllEmployeesExcel } = require('./utils/exportUtils');
const fs = require('fs');
const path = require('path');

function calculateSegmentHours(segment) {
  if (!segment.start || !segment.end) return 0;
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  return (endMinutes - startMinutes) / 60;
}

function calculateRealHours(pointages) {
  if (pointages.length === 0 || pointages.length % 2 !== 0) return 0;
  let totalMinutes = 0;
  for (let i = 0; i < pointages.length; i += 2) {
    const entree = new Date(pointages[i].horodatage);
    const sortie = new Date(pointages[i + 1].horodatage);
    const diffMinutes = (sortie - entree) / (1000 * 60);
    totalMinutes += diffMinutes;
  }
  return totalMinutes / 60;
}

async function genererRapportTest() {
  console.log('\n🔄 Génération du rapport Excel de test...\n');

  try {
    const dateDebut = new Date('2025-11-01T00:00:00.000Z');
    const dateFin = new Date('2025-11-30T23:59:59.999Z');

    // Récupérer les employés
    const employes = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: { id: true, email: true, nom: true, prenom: true, role: true },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }]
    });

    // Récupérer les données
    const shifts = await prisma.shift.findMany({
      where: { date: { gte: dateDebut, lte: dateFin } },
      orderBy: { date: 'asc' }
    });

    const pointages = await prisma.pointage.findMany({
      where: { horodatage: { gte: dateDebut, lte: dateFin } },
      orderBy: { horodatage: 'asc' }
    });

    const conges = await prisma.conge.findMany({
      where: {
        statut: 'approuvé',
        OR: [{ dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }]
      },
      select: { id: true, userId: true, dateDebut: true, dateFin: true, type: true }
    });

    console.log(`📊 Données collectées:`);
    console.log(`   • ${employes.length} employés`);
    console.log(`   • ${shifts.length} shifts`);
    console.log(`   • ${pointages.length} pointages`);
    console.log(`   • ${conges.length} congés approuvés\n`);

    // Grouper les données
    const shiftsParEmploye = new Map();
    const pointagesParEmploye = new Map();
    const congesParEmploye = new Map();

    shifts.forEach(s => {
      if (!shiftsParEmploye.has(s.employeId)) shiftsParEmploye.set(s.employeId, []);
      shiftsParEmploye.get(s.employeId).push(s);
    });

    pointages.forEach(p => {
      if (!pointagesParEmploye.has(p.userId)) pointagesParEmploye.set(p.userId, []);
      pointagesParEmploye.get(p.userId).push(p);
    });

    conges.forEach(c => {
      if (!congesParEmploye.has(c.userId)) congesParEmploye.set(c.userId, []);
      congesParEmploye.get(c.userId).push(c);
    });

    // Construire les rapports
    const rapportsEmployes = [];

    for (const employe of employes) {
      const shiftsEmploye = shiftsParEmploye.get(employe.id) || [];
      const pointagesEmploye = pointagesParEmploye.get(employe.id) || [];
      const congesEmploye = congesParEmploye.get(employe.id) || [];

      // Map des congés par jour
      const congesParJour = new Map();
      congesEmploye.forEach(conge => {
        let currentDate = new Date(conge.dateDebut);
        const endDate = new Date(conge.dateFin);
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          congesParJour.set(dateKey, { type: conge.type });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      // Map des pointages par jour
      const pointagesParJour = new Map();
      pointagesEmploye.forEach(p => {
        const dateKey = p.horodatage.toISOString().split('T')[0];
        if (!pointagesParJour.has(dateKey)) pointagesParJour.set(dateKey, []);
        pointagesParJour.get(dateKey).push(p);
      });

      let heuresPrevues = 0;
      let heuresTravaillees = 0;
      let heuresSupplementaires = 0;
      let absencesInjustifiees = 0;
      let joursOuvrables = 0;
      let joursTravailles = 0;
      const heuresParJour = [];

      shiftsEmploye.forEach(shift => {
        const dateKey = shift.date.toISOString().split('T')[0];
        const pointagesJour = pointagesParJour.get(dateKey) || [];
        const congeJour = congesParJour.get(dateKey);

        if (shift.type === 'présence' && shift.segments) {
          let heuresPrevuesJour = 0;
          joursOuvrables++;

          shift.segments.forEach(segment => {
            if (segment.start && segment.end && !segment.isExtra) {
              const heures = calculateSegmentHours(segment);
              heuresPrevues += heures;
              heuresPrevuesJour += heures;
            }
            if (segment.isExtra) {
              heuresSupplementaires += calculateSegmentHours(segment);
            }
          });

          const heuresRealisees = calculateRealHours(pointagesJour);
          heuresTravaillees += heuresRealisees;

          if (heuresRealisees > 0) {
            joursTravailles++;
            const depassement = Math.max(0, heuresRealisees - heuresPrevuesJour);
            if (depassement > 0.5) heuresSupplementaires += depassement;

            heuresParJour.push({
              jour: shift.date,
              type: 'travail',
              heuresPrevues: heuresPrevuesJour,
              heuresTravaillees: heuresRealisees,
              details: null
            });
          } else if (congeJour) {
            heuresParJour.push({
              jour: shift.date,
              type: 'absence',
              heuresPrevues: heuresPrevuesJour,
              heuresTravaillees: 0,
              details: { type: 'congé', congeType: congeJour.type }
            });
          } else {
            absencesInjustifiees++;
            heuresParJour.push({
              jour: shift.date,
              type: 'absence',
              heuresPrevues: heuresPrevuesJour,
              heuresTravaillees: 0,
              details: undefined
            });
          }
        }
      });

      rapportsEmployes.push({
        id: employe.id,
        nom: employe.nom,
        prenom: employe.prenom,
        email: employe.email,
        role: employe.role,
        heuresPrevues,
        heuresTravaillees,
        heuresSupplementaires,
        absencesInjustifiees,
        statistiques: {
          joursOuvrables,
          joursTravailles
        },
        heuresParJour
      });
    }

    console.log(`✅ ${rapportsEmployes.length} rapports employés générés\n`);

    // Générer l'Excel
    console.log('📄 Génération du fichier Excel...');
    const buffer = await generateAllEmployeesExcel(rapportsEmployes, 'mois', dateDebut, dateFin);

    // Sauvegarder
    const filename = `rapport_test_novembre_2025_${Date.now()}.xlsx`;
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, buffer);

    console.log(`\n✅ Fichier généré: ${filename}`);
    console.log(`📂 Emplacement: ${filepath}`);
    console.log(`📊 Taille: ${(buffer.length / 1024).toFixed(1)} KB\n`);

    // Afficher un résumé des données
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 RÉSUMÉ DES DONNÉES DANS L\'EXCEL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const employesAvecDonnees = rapportsEmployes.filter(e => 
      e.heuresPrevues > 0 || e.heuresTravaillees > 0 || e.absencesInjustifiees > 0
    );

    console.log(`Employés avec données: ${employesAvecDonnees.length}/${rapportsEmployes.length}\n`);

    employesAvecDonnees.forEach(emp => {
      const cpDates = emp.heuresParJour.filter(j => j.details?.congeType?.toLowerCase().includes('cp') || j.details?.congeType?.toLowerCase().includes('congé')).length;
      const rttDates = emp.heuresParJour.filter(j => j.details?.congeType?.toLowerCase().includes('rtt')).length;
      const maladieDates = emp.heuresParJour.filter(j => j.details?.congeType?.toLowerCase().includes('maladie')).length;
      const injustDates = emp.heuresParJour.filter(j => j.type === 'absence' && !j.details).length;

      if (cpDates > 0 || rttDates > 0 || maladieDates > 0 || injustDates > 0) {
        console.log(`${emp.nom} ${emp.prenom}:`);
        console.log(`   Heures: ${emp.heuresPrevues.toFixed(1)}h prévues, ${emp.heuresTravaillees.toFixed(1)}h travaillées`);
        if (cpDates > 0) console.log(`   ✅ ${cpDates} jours CP`);
        if (rttDates > 0) console.log(`   ✅ ${rttDates} jours RTT`);
        if (maladieDates > 0) console.log(`   ✅ ${maladieDates} jours Maladie`);
        if (injustDates > 0) console.log(`   ❌ ${injustDates} jours Abs. Injustifiées`);
        console.log('');
      }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Test terminé avec succès !');
    console.log('🔍 Ouvrez le fichier Excel pour vérifier visuellement.\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

genererRapportTest();
