const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function testerEmployeSpecifique() {
  try {
    // Tester avec TestComplet Validation (ID: 88) qui a beaucoup de données
    const employeId = 88;
    const dateDebut = new Date('2025-11-01T00:00:00.000Z');
    const dateFin = new Date('2025-11-30T23:59:59.999Z');

    console.log('\n╔═════════════════════════════════════════════════════════════╗');
    console.log('║  COMPARAISON RAPPORT INDIVIDUEL vs RAPPORT GLOBAL          ║');
    console.log('║  Employé: TestComplet Validation (ID: 88)                  ║');
    console.log('╚═════════════════════════════════════════════════════════════╝\n');

    // Récupérer l'employé
    const employe = await prisma.user.findUnique({
      where: { id: employeId },
      select: { id: true, nom: true, prenom: true, email: true, role: true }
    });

    console.log('👤 Employé:', `${employe.nom} ${employe.prenom}`);

    // Récupérer les données
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: employeId,
        date: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { date: 'asc' }
    });

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employeId,
        horodatage: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { horodatage: 'asc' }
    });

    const conges = await prisma.conge.findMany({
      where: {
        userId: employeId,
        statut: 'approuvé',
        OR: [{ dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }]
      },
      select: { id: true, type: true, dateDebut: true, dateFin: true }
    });

    console.log('\n📊 Données brutes:');
    console.log(`   • ${shifts.length} shifts`);
    console.log(`   • ${pointages.length} pointages`);
    console.log(`   • ${conges.length} congés approuvés`);

    // === CALCUL COMME DANS LE RAPPORT GLOBAL ===
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 MÉTHODE RAPPORT GLOBAL (export-all)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Créer map des congés par jour
    const congesParJour = new Map();
    conges.forEach(conge => {
      let currentDate = new Date(conge.dateDebut);
      const endDate = new Date(conge.dateFin);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        congesParJour.set(dateKey, { type: conge.type });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Grouper pointages par jour
    const pointagesParJour = new Map();
    pointages.forEach(p => {
      const dateKey = p.horodatage.toISOString().split('T')[0];
      if (!pointagesParJour.has(dateKey)) pointagesParJour.set(dateKey, []);
      pointagesParJour.get(dateKey).push(p);
    });

    let heuresPrevues = 0;
    let heuresTravaillees = 0;
    let heuresSupplementaires = 0;
    let absencesJustifiees = 0;
    let absencesInjustifiees = 0;
    let joursOuvrables = 0;
    let joursTravailles = 0;

    const heuresParJour = []; // Pour export Excel

    shifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      const pointagesJour = pointagesParJour.get(dateKey) || [];
      const congeJour = congesParJour.get(dateKey);

      if (shift.type === 'présence' && shift.segments) {
        let heuresPrevuesJour = 0;
        joursOuvrables++;

        shift.segments.forEach(segment => {
          if (segment.start && segment.end && !segment.isExtra) {
            const heuresSegment = calculateSegmentHours(segment);
            heuresPrevues += heuresSegment;
            heuresPrevuesJour += heuresSegment;
          }
          if (segment.isExtra) {
            const heuresExtra = calculateSegmentHours(segment);
            heuresSupplementaires += heuresExtra;
          }
        });

        const heuresRealisees = calculateRealHours(pointagesJour);
        heuresTravaillees += heuresRealisees;

        if (heuresRealisees > 0) {
          joursTravailles++;
          
          // Heures supp additionnelles (dépassement)
          const depassement = Math.max(0, heuresRealisees - heuresPrevuesJour);
          if (depassement > 0.5) {
            heuresSupplementaires += depassement;
          }

          // Ajouter au détail
          heuresParJour.push({
            jour: shift.date,
            type: 'travail',
            heuresPrevues: heuresPrevuesJour,
            heuresTravaillees: heuresRealisees,
            details: null
          });
        } else if (congeJour) {
          absencesJustifiees++;
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

    console.log('Résultats RAPPORT GLOBAL:');
    console.log(`   • Jours ouvrables: ${joursOuvrables}`);
    console.log(`   • Jours travaillés: ${joursTravailles}`);
    console.log(`   • Heures prévues: ${heuresPrevues.toFixed(1)}h`);
    console.log(`   • Heures travaillées: ${heuresTravaillees.toFixed(1)}h`);
    console.log(`   • Heures supp: ${heuresSupplementaires.toFixed(1)}h`);
    console.log(`   • Abs. justifiées: ${absencesJustifiees}`);
    console.log(`   • Abs. injustifiées: ${absencesInjustifiees}`);
    console.log(`   • heuresParJour length: ${heuresParJour.length}`);

    // === CALCUL COMME DANS LE RAPPORT INDIVIDUEL ===
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 MÉTHODE RAPPORT INDIVIDUEL (rapport-detaille)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let heuresPrevuesIndiv = 0;
    let heuresTravailleesIndiv = 0;
    let heuresSuppIndiv = 0;
    let absencesJustifieesIndiv = 0;
    let absencesInjustifieesIndiv = 0;
    let joursOuvrablesIndiv = 0;
    let joursTravaillesIndiv = 0;

    shifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      const pointagesJour = pointagesParJour.get(dateKey) || [];
      const congeJour = congesParJour.get(dateKey);

      if (shift.type === 'présence' && shift.segments) {
        let heuresPrevuesJour = 0;
        joursOuvrablesIndiv++;

        shift.segments.forEach(segment => {
          if (segment.start && segment.end && !segment.isExtra) {
            heuresPrevuesJour += calculateSegmentHours(segment);
          }
        });

        heuresPrevuesIndiv += heuresPrevuesJour;

        const heuresRealisees = calculateRealHours(pointagesJour);
        heuresTravailleesIndiv += heuresRealisees;

        if (heuresRealisees > 0) {
          joursTravaillesIndiv++;
          const ecart = heuresRealisees - heuresPrevuesJour;
          if (ecart > 0) {
            heuresSuppIndiv += ecart;
          }
        } else if (congeJour) {
          absencesJustifieesIndiv++;
        } else {
          absencesInjustifieesIndiv++;
        }
      }
    });

    console.log('Résultats RAPPORT INDIVIDUEL:');
    console.log(`   • Jours ouvrables: ${joursOuvrablesIndiv}`);
    console.log(`   • Jours travaillés: ${joursTravaillesIndiv}`);
    console.log(`   • Heures prévues: ${heuresPrevuesIndiv.toFixed(1)}h`);
    console.log(`   • Heures travaillées: ${heuresTravailleesIndiv.toFixed(1)}h`);
    console.log(`   • Heures supp: ${heuresSuppIndiv.toFixed(1)}h`);
    console.log(`   • Abs. justifiées: ${absencesJustifieesIndiv}`);
    console.log(`   • Abs. injustifiées: ${absencesInjustifieesIndiv}`);

    // === COMPARAISON ===
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 COMPARAISON & DIFFÉRENCES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const diff = {
      heuresPrevues: heuresPrevues - heuresPrevuesIndiv,
      heuresTravaillees: heuresTravaillees - heuresTravailleesIndiv,
      heuresSupp: heuresSupplementaires - heuresSuppIndiv,
      absInjust: absencesInjustifiees - absencesInjustifieesIndiv
    };

    console.log('Différences (Global - Individuel):');
    Object.entries(diff).forEach(([key, val]) => {
      const icon = val === 0 ? '✅' : '⚠️';
      console.log(`   ${icon} ${key}: ${val.toFixed ? val.toFixed(1) : val}`);
    });

    if (Object.values(diff).every(v => Math.abs(v) < 0.1)) {
      console.log('\n✅ LES DEUX MÉTHODES DONNENT LES MÊMES RÉSULTATS !');
    } else {
      console.log('\n⚠️  DIVERGENCE DÉTECTÉE - Causes possibles:');
      if (Math.abs(diff.heuresSupp) > 0.1) {
        console.log('   • Calcul des heures supplémentaires différent (segments extra vs dépassement)');
      }
    }

    // Afficher quelques jours de détail
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📅 DÉTAIL DES 5 PREMIERS JOURS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    heuresParJour.slice(0, 5).forEach(jour => {
      const date = new Date(jour.jour).toLocaleDateString('fr-FR');
      console.log(`📆 ${date}:`);
      console.log(`   Type: ${jour.type}`);
      console.log(`   Prévues: ${jour.heuresPrevues}h`);
      console.log(`   Travaillées: ${jour.heuresTravaillees}h`);
      if (jour.details) {
        console.log(`   Détails: ${JSON.stringify(jour.details)}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testerEmployeSpecifique();
