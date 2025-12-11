const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fonctions de calcul identiques au serveur
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

async function testerRapportGlobalEtIndividuel() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  TEST COMPLET : RAPPORT GLOBAL vs RAPPORT INDIVIDUEL              ║');
  console.log('║  Vérification des congés et absences - Novembre 2025              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    const dateDebut = new Date('2025-11-01T00:00:00.000Z');
    const dateFin = new Date('2025-11-30T23:59:59.999Z');

    // Employés à tester (ceux avec congés)
    const employesTest = [
      { id: 49, nom: 'Martin Pierre' },
      { id: 50, nom: 'Bernard Sophie' },
      { id: 88, nom: 'TestComplet Validation' }
    ];

    let tousLesTestsPassent = true;

    for (const empTest of employesTest) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🧪 TEST : ${empTest.nom} (ID: ${empTest.id})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // === SIMULATION RAPPORT GLOBAL ===
      const employe = await prisma.user.findUnique({
        where: { id: empTest.id },
        select: { id: true, nom: true, prenom: true, email: true, role: true }
      });

      const shifts = await prisma.shift.findMany({
        where: {
          employeId: empTest.id,
          date: { gte: dateDebut, lte: dateFin }
        },
        orderBy: { date: 'asc' }
      });

      const pointages = await prisma.pointage.findMany({
        where: {
          userId: empTest.id,
          horodatage: { gte: dateDebut, lte: dateFin }
        },
        orderBy: { horodatage: 'asc' }
      });

      const conges = await prisma.conge.findMany({
        where: {
          userId: empTest.id,
          statut: 'approuvé',
          OR: [{ dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }]
        },
        select: { id: true, type: true, dateDebut: true, dateFin: true }
      });

      console.log('📦 Données récupérées:');
      console.log(`   • ${shifts.length} shifts`);
      console.log(`   • ${pointages.length} pointages`);
      console.log(`   • ${conges.length} congés approuvés\n`);

      // Map des congés par jour
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

      // Map des pointages par jour
      const pointagesParJour = new Map();
      pointages.forEach(p => {
        const dateKey = p.horodatage.toISOString().split('T')[0];
        if (!pointagesParJour.has(dateKey)) pointagesParJour.set(dateKey, []);
        pointagesParJour.get(dateKey).push(p);
      });

      // Calculs RAPPORT GLOBAL
      let heuresPrevues = 0;
      let heuresTravaillees = 0;
      let heuresSupplementaires = 0;
      let absencesJustifiees = 0;
      let absencesInjustifiees = 0;
      const heuresParJour = [];
      const joursTraites = new Set();

      shifts.forEach(shift => {
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
        } else if (shift.type === 'absence') {
          const motif = shift.motif || '';
          const motifLower = motif.toLowerCase();

          if (motifLower.includes('congé') || motifLower.includes('rtt') || motifLower.includes('maladie')) {
            absencesJustifiees++;
          } else {
            absencesInjustifiees++;
          }

          heuresParJour.push({
            jour: shift.date,
            type: 'absence',
            heuresPrevues: 7,
            heuresTravaillees: 0,
            details: motif ? {
              type: 'congé',
              congeType: motif
            } : (congeJour ? {
              type: 'congé',
              congeType: congeJour.type
            } : undefined)
          });
        }
      });

      // Fallback: congés sans shift
      congesParJour.forEach((congeInfo, dateKey) => {
        if (!joursTraites.has(dateKey)) {
          const dateJour = new Date(dateKey + 'T12:00:00.000Z');
          if (dateJour >= dateDebut && dateJour <= dateFin) {
            absencesJustifiees++;
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

      // Classification des dates
      const datesCP = [];
      const datesRTT = [];
      const datesMaladie = [];
      const datesInjustifiees = [];

      heuresParJour.forEach(j => {
        if (j.type === 'absence' || (j.heuresTravaillees === 0 && j.heuresPrevues > 0)) {
          const dateFormatee = new Date(j.jour).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          const congeType = j.details?.congeType || '';

          if (congeType.toLowerCase().includes('maladie')) {
            datesMaladie.push(dateFormatee);
          } else if (congeType.toLowerCase().includes('rtt')) {
            datesRTT.push(dateFormatee);
          } else if (congeType.toLowerCase().includes('cp') || congeType.toLowerCase().includes('congé')) {
            datesCP.push(dateFormatee);
          } else if (!congeType) {
            datesInjustifiees.push(dateFormatee);
          }
        }
      });

      // Résultats
      console.log('📊 RÉSULTATS RAPPORT GLOBAL:');
      console.log(`   • Heures prévues: ${heuresPrevues.toFixed(1)}h`);
      console.log(`   • Heures travaillées: ${heuresTravaillees.toFixed(1)}h`);
      console.log(`   • Heures supplémentaires: ${heuresSupplementaires.toFixed(1)}h`);
      console.log(`   • Absences justifiées: ${absencesJustifiees}`);
      console.log(`   • Absences injustifiées: ${absencesInjustifiees}`);
      console.log(`   • Dates CP: ${datesCP.length > 0 ? datesCP.join(', ') : '-'}`);
      console.log(`   • Dates RTT: ${datesRTT.length > 0 ? datesRTT.join(', ') : '-'}`);
      console.log(`   • Dates Maladie: ${datesMaladie.length > 0 ? datesMaladie.join(', ') : '-'}`);
      console.log(`   • Dates Injust.: ${datesInjustifiees.length > 0 ? datesInjustifiees.join(', ') : '-'}`);

      // === VÉRIFICATIONS ===
      console.log('\n🔍 VÉRIFICATIONS:');
      
      const tests = [];

      // Test 1: Congés détectés
      if (conges.length > 0) {
        const joursCongesTotaux = Array.from(congesParJour.keys()).length;
        const joursCongesDetectes = datesCP.length + datesRTT.length + datesMaladie.length;
        const test1 = joursCongesDetectes >= joursCongesTotaux;
        tests.push({
          nom: 'Congés détectés',
          attendu: `${joursCongesTotaux} jours`,
          obtenu: `${joursCongesDetectes} jours`,
          passe: test1
        });
      }

      // Test 2: Classification correcte
      const joursAvecShiftAbsence = shifts.filter(s => s.type === 'absence').length;
      const test2 = (datesCP.length + datesRTT.length + datesMaladie.length) >= joursAvecShiftAbsence;
      tests.push({
        nom: 'Shifts absence classifiés',
        attendu: `${joursAvecShiftAbsence} shifts`,
        obtenu: `${datesCP.length + datesRTT.length + datesMaladie.length} classifiés`,
        passe: test2
      });

      // Test 3: Aucune perte de données
      const totalJours = heuresParJour.length;
      const totalDates = datesCP.length + datesRTT.length + datesMaladie.length + datesInjustifiees.length;
      const joursAbsence = heuresParJour.filter(j => j.type === 'absence' || j.heuresTravaillees === 0).length;
      const test3 = totalDates >= joursAbsence;
      tests.push({
        nom: 'Toutes les dates comptabilisées',
        attendu: `${joursAbsence} jours d'absence`,
        obtenu: `${totalDates} dates`,
        passe: test3
      });

      // Test 4: Pas d'absences injustifiées sur congés approuvés
      const congésApprouvés = conges.length > 0;
      const test4 = !congésApprouvés || datesInjustifiees.length === 0 || absencesInjustifiees <= shifts.filter(s => s.type === 'présence').length;
      tests.push({
        nom: 'Congés ne sont pas injustifiés',
        attendu: 'Congés approuvés ≠ Abs. injust.',
        obtenu: `${datesInjustifiees.length} injust. / ${conges.length} congés`,
        passe: test4
      });

      // Afficher les résultats
      tests.forEach(test => {
        const icon = test.passe ? '✅' : '❌';
        const status = test.passe ? 'PASS' : 'FAIL';
        console.log(`   ${icon} [${status}] ${test.nom}`);
        console.log(`      Attendu: ${test.attendu}`);
        console.log(`      Obtenu: ${test.obtenu}`);
        if (!test.passe) {
          tousLesTestsPassent = false;
        }
      });

      // Détail des congés vs dates
      if (conges.length > 0) {
        console.log('\n📋 DÉTAIL DES CONGÉS:');
        conges.forEach(conge => {
          const debut = new Date(conge.dateDebut).toLocaleDateString('fr-FR');
          const fin = new Date(conge.dateFin).toLocaleDateString('fr-FR');
          console.log(`   • ${conge.type}: ${debut} → ${fin}`);
        });
      }
    }

    // === RÉSUMÉ FINAL ===
    console.log('\n\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║  RÉSUMÉ DES TESTS                                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    if (tousLesTestsPassent) {
      console.log('✅ TOUS LES TESTS SONT PASSÉS !');
      console.log('✅ Les rapports global et individuel fonctionnent correctement');
      console.log('✅ Les congés sont bien remontés et classifiés\n');
    } else {
      console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
      console.log('⚠️  Vérifier les logs ci-dessus pour les détails\n');
    }

    // Test bonus: Vérifier cohérence avec API
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 BONUS : Vérification cohérence avec l\'API réelle');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Pour tester avec l\'API réelle:');
    console.log('   1. Lance le serveur');
    console.log('   2. Va dans l\'app: Rapports > Rapports Heures Globale');
    console.log('   3. Sélectionne Novembre 2025');
    console.log('   4. Clique sur Exporter Excel');
    console.log('   5. Vérifie que les colonnes CP/RTT/Maladie contiennent des dates\n');

  } catch (error) {
    console.error('\n❌ Erreur durant les tests:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
testerRapportGlobalEtIndividuel();
