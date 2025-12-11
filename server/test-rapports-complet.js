const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fonction pour calculer les heures d'un segment
function calculateSegmentHours(segment) {
  if (!segment.start || !segment.end) return 0;
  
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

// Fonction pour calculer les heures réalisées
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

async function analyserRapports() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔍 ANALYSE COMPLÈTE DES RAPPORTS RH - NOVEMBRE 2025');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const dateDebut = new Date('2025-11-01T00:00:00.000Z');
    const dateFin = new Date('2025-11-30T23:59:59.999Z');

    console.log('📅 Période analysée:', {
      debut: dateDebut.toLocaleDateString('fr-FR'),
      fin: dateFin.toLocaleDateString('fr-FR')
    });

    // 1. RÉCUPÉRATION DES DONNÉES BRUTES
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ÉTAPE 1 : RÉCUPÉRATION DES DONNÉES BRUTES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const employes = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: { id: true, nom: true, prenom: true, email: true, role: true },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }]
    });

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
      select: {
        id: true,
        userId: true,
        type: true,
        statut: true,
        dateDebut: true,
        dateFin: true
      }
    });

    console.log('📦 Données récupérées:');
    console.log(`   • ${employes.length} employés`);
    console.log(`   • ${shifts.length} shifts (planning)`);
    console.log(`   • ${pointages.length} pointages`);
    console.log(`   • ${conges.length} congés approuvés`);

    // 2. ANALYSE PAR EMPLOYÉ
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👥 ÉTAPE 2 : ANALYSE DÉTAILLÉE PAR EMPLOYÉ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Grouper les données par employé
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

    let totalIssues = 0;
    const employesAvecDonnees = [];

    for (const emp of employes) {
      const shiftsEmp = shiftsParEmploye.get(emp.id) || [];
      const pointagesEmp = pointagesParEmploye.get(emp.id) || [];
      const congesEmp = congesParEmploye.get(emp.id) || [];

      if (shiftsEmp.length === 0 && pointagesEmp.length === 0 && congesEmp.length === 0) {
        continue; // Skip employés sans données
      }

      employesAvecDonnees.push(emp);

      console.log(`\n┌─────────────────────────────────────────────────────────┐`);
      console.log(`│ ${emp.nom} ${emp.prenom} (ID: ${emp.id})`.padEnd(58) + '│');
      console.log(`└─────────────────────────────────────────────────────────┘`);

      // Créer map des congés par jour
      const congesParJour = new Map();
      congesEmp.forEach(conge => {
        let currentDate = new Date(conge.dateDebut);
        const endDate = new Date(conge.dateFin);
        
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          congesParJour.set(dateKey, { type: conge.type, id: conge.id });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      // Grouper pointages par jour
      const pointagesParJour = new Map();
      pointagesEmp.forEach(p => {
        const dateKey = p.horodatage.toISOString().split('T')[0];
        if (!pointagesParJour.has(dateKey)) pointagesParJour.set(dateKey, []);
        pointagesParJour.get(dateKey).push(p);
      });

      // Analyser chaque shift
      let heuresPrevuesTotal = 0;
      let heuresTravailleesTotal = 0;
      let heuresSupp = 0;
      let joursAvecAbsence = [];
      let joursAvecRetard = [];
      let joursAvecConge = [];
      const issues = [];

      shiftsEmp.forEach(shift => {
        const dateKey = shift.date.toISOString().split('T')[0];
        const dateFormatee = new Date(shift.date).toLocaleDateString('fr-FR');
        const pointagesJour = pointagesParJour.get(dateKey) || [];
        const congeJour = congesParJour.get(dateKey);

        if (shift.type === 'présence' && shift.segments) {
          let heuresPrevuesJour = 0;
          let heuresExtraJour = 0;

          shift.segments.forEach(segment => {
            const heures = calculateSegmentHours(segment);
            if (segment.isExtra) {
              heuresExtraJour += heures;
            } else {
              heuresPrevuesJour += heures;
            }
          });

          heuresPrevuesTotal += heuresPrevuesJour;

          const heuresRealisees = calculateRealHours(pointagesJour);
          heuresTravailleesTotal += heuresRealisees;

          // Vérifier cohérence
          if (congeJour) {
            joursAvecConge.push({ date: dateFormatee, type: congeJour.type });
            if (pointagesJour.length > 0) {
              issues.push(`⚠️  ${dateFormatee}: Congé ${congeJour.type} MAIS ${pointagesJour.length} pointages présents !`);
              totalIssues++;
            }
          } else if (pointagesJour.length === 0 && heuresPrevuesJour > 0) {
            joursAvecAbsence.push(dateFormatee);
            issues.push(`❌ ${dateFormatee}: ABSENCE (${heuresPrevuesJour.toFixed(1)}h prévues, 0 pointages)`);
            totalIssues++;
          } else if (pointagesJour.length % 2 !== 0) {
            issues.push(`⚠️  ${dateFormatee}: Pointage incomplet (${pointagesJour.length} pointages - nombre impair)`);
            totalIssues++;
          } else if (heuresRealisees > 0) {
            const ecart = heuresRealisees - heuresPrevuesJour;
            if (Math.abs(ecart) > 0.5) { // Écart > 30 min
              if (ecart > 0) {
                heuresSupp += ecart;
                issues.push(`📈 ${dateFormatee}: +${ecart.toFixed(1)}h (prévu: ${heuresPrevuesJour.toFixed(1)}h, réel: ${heuresRealisees.toFixed(1)}h)`);
              } else {
                issues.push(`📉 ${dateFormatee}: ${ecart.toFixed(1)}h (prévu: ${heuresPrevuesJour.toFixed(1)}h, réel: ${heuresRealisees.toFixed(1)}h)`);
              }
            }
          }
        }
      });

      // Afficher le résumé
      console.log('\n📊 Résumé:');
      console.log(`   • Shifts: ${shiftsEmp.length}`);
      console.log(`   • Pointages: ${pointagesEmp.length}`);
      console.log(`   • Congés approuvés: ${congesEmp.length} (${joursAvecConge.length} jours)`);
      console.log(`   • Heures prévues: ${heuresPrevuesTotal.toFixed(1)}h`);
      console.log(`   • Heures travaillées: ${heuresTravailleesTotal.toFixed(1)}h`);
      console.log(`   • Heures supp: ${heuresSupp.toFixed(1)}h`);
      console.log(`   • Absences: ${joursAvecAbsence.length} jours`);

      if (joursAvecConge.length > 0) {
        console.log('\n✅ Congés:');
        joursAvecConge.forEach(c => console.log(`   • ${c.date}: ${c.type}`));
      }

      if (issues.length > 0) {
        console.log('\n⚠️  Issues détectées:');
        issues.forEach(issue => console.log(`   ${issue}`));
      }
    }

    // 3. SYNTHÈSE GLOBALE
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 ÉTAPE 3 : SYNTHÈSE GLOBALE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`✅ Employés avec données: ${employesAvecDonnees.length}/${employes.length}`);
    console.log(`⚠️  Total d'anomalies détectées: ${totalIssues}`);

    // Vérifier la cohérence shifts vs pointages
    const employesAvecShiftsSansPointages = employesAvecDonnees.filter(emp => {
      const shiftsEmp = shiftsParEmploye.get(emp.id) || [];
      const pointagesEmp = pointagesParEmploye.get(emp.id) || [];
      return shiftsEmp.length > 0 && pointagesEmp.length === 0;
    });

    if (employesAvecShiftsSansPointages.length > 0) {
      console.log('\n⚠️  ALERTE - Employés avec shifts mais AUCUN pointage:');
      employesAvecShiftsSansPointages.forEach(emp => {
        const shiftsEmp = shiftsParEmploye.get(emp.id) || [];
        console.log(`   • ${emp.nom} ${emp.prenom}: ${shiftsEmp.length} shifts, 0 pointages`);
      });
    }

    // Vérifier congés vs shifts
    console.log('\n📋 Analyse des congés:');
    const congesParType = {};
    conges.forEach(c => {
      congesParType[c.type] = (congesParType[c.type] || 0) + 1;
    });
    Object.entries(congesParType).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count} congés`);
    });

    // 4. RECOMMANDATIONS
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 ÉTAPE 4 : RECOMMANDATIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (totalIssues === 0) {
      console.log('✅ Aucune anomalie critique détectée !');
      console.log('✅ Les données sont cohérentes entre shifts, pointages et congés.');
    } else {
      console.log('⚠️  Anomalies détectées - Actions recommandées:');
      console.log('   1. Vérifier les absences non justifiées');
      console.log('   2. Compléter les pointages incomplets');
      console.log('   3. Valider les congés en attente si nécessaire');
      console.log('   4. Contrôler les heures supplémentaires importantes');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ ANALYSE TERMINÉE');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
analyserRapports();
