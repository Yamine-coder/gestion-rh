const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateAllEmployeesExcel } = require('./utils/exportUtils');
const fs = require('fs');
const path = require('path');

// Copier les fonctions du vrai code
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

async function testerAvecNouvelleLogique() {
  console.log('\n🔄 Test avec la NOUVELLE logique (congés sans shifts)...\n');

  try {
    const dateDebut = new Date('2025-11-01T00:00:00.000Z');
    const dateFin = new Date('2025-11-30T23:59:59.999Z');

    // Récupérer uniquement les employés avec congés
    const employesAvecConges = await prisma.user.findMany({
      where: {
        id: { in: [49, 50, 88] } // Martin Pierre, Bernard Sophie, TestComplet
      },
      select: { id: true, email: true, nom: true, prenom: true, role: true }
    });

    const shifts = await prisma.shift.findMany({
      where: {
        employeId: { in: [49, 50, 88] },
        date: { gte: dateDebut, lte: dateFin }
      }
    });

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: { in: [49, 50, 88] },
        horodatage: { gte: dateDebut, lte: dateFin }
      }
    });

    const conges = await prisma.conge.findMany({
      where: {
        userId: { in: [49, 50, 88] },
        statut: 'approuvé',
        OR: [{ dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }]
      },
      select: { id: true, userId: true, dateDebut: true, dateFin: true, type: true }
    });

    console.log(`📦 Données:`);
    console.log(`   • ${employesAvecConges.length} employés`);
    console.log(`   • ${shifts.length} shifts`);
    console.log(`   • ${conges.length} congés approuvés\n`);

    // Grouper
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

    const rapportsEmployes = [];

    for (const employe of employesAvecConges) {
      const shiftsEmploye = shiftsParEmploye.get(employe.id) || [];
      const pointagesEmploye = pointagesParEmploye.get(employe.id) || [];
      const congesEmploye = congesParEmploye.get(employe.id) || [];

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👤 ${employe.nom} ${employe.prenom}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

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

      console.log(`   Congés map: ${congesParJour.size} jours`);
      console.log(`   Shifts: ${shiftsEmploye.length}`);

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
      const heuresParJour = [];
      const joursTraites = new Set();

      // Traiter chaque shift
      shiftsEmploye.forEach(shift => {
        const dateKey = shift.date.toISOString().split('T')[0];
        joursTraites.add(dateKey);
        const pointagesJour = pointagesParJour.get(dateKey) || [];
        const congeJour = congesParJour.get(dateKey);

        if (shift.type === 'présence' && shift.segments) {
          let heuresPrevuesJour = 0;

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

      // 🆕 NOUVELLE LOGIQUE: Ajouter les jours de congés sans shift
      console.log(`\n   Avant ajout congés: ${heuresParJour.length} jours`);
      
      congesParJour.forEach((congeInfo, dateKey) => {
        if (!joursTraites.has(dateKey)) {
          const dateJour = new Date(dateKey + 'T12:00:00.000Z');
          
          if (dateJour >= dateDebut && dateJour <= dateFin) {
            console.log(`   ✅ Ajout congé sans shift: ${dateJour.toLocaleDateString('fr-FR')} - ${congeInfo.type}`);
            
            heuresParJour.push({
              jour: dateJour,
              type: 'absence',
              heuresPrevues: 7,
              heuresTravaillees: 0,
              details: { type: 'congé', congeType: congeInfo.type }
            });
          }
        }
      });

      console.log(`   Après ajout congés: ${heuresParJour.length} jours\n`);

      // Compter les types de dates
      const cpDates = heuresParJour.filter(j => j.details?.congeType?.toLowerCase().includes('cp') || j.details?.congeType?.toLowerCase().includes('congé')).length;
      const injustDates = heuresParJour.filter(j => j.type === 'absence' && !j.details).length;

      console.log(`   📊 Résultat:`);
      console.log(`      CP: ${cpDates} jours`);
      console.log(`      Abs. Injust.: ${injustDates} jours`);

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
        statistiques: { joursOuvrables: 22, joursTravailles: 0 },
        heuresParJour
      });
    }

    // Générer Excel
    console.log(`\n\n📄 Génération Excel...`);
    const buffer = await generateAllEmployeesExcel(rapportsEmployes, 'mois', dateDebut, dateFin);

    const filename = `rapport_AVEC_CONGES_${Date.now()}.xlsx`;
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, buffer);

    console.log(`\n✅ Fichier généré: ${filename}`);
    console.log(`📊 Taille: ${(buffer.length / 1024).toFixed(1)} KB`);
    console.log(`\n🎯 Ce fichier DOIT contenir les congés dans les colonnes CP/RTT/Maladie !\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testerAvecNouvelleLogique();
