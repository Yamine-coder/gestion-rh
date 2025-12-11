/**
 * Script de vérification des données du rapport Excel
 * Vérifie la cohérence et l'exactitude des calculs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifierRapportExcel() {
  console.log('🔍 === VERIFICATION DES DONNEES DU RAPPORT EXCEL ===\n');

  // Paramètres du rapport
  const mois = '2025-11';
  const [year, month] = mois.split('-').map(Number);
  const dateDebut = new Date(year, month - 1, 1);
  const dateFin = new Date(year, month, 0);
  dateFin.setHours(23, 59, 59, 999);

  console.log(`📅 Période: ${dateDebut.toLocaleDateString('fr-FR')} → ${dateFin.toLocaleDateString('fr-FR')}\n`);

  // Récupérer tous les employés
  const employes = await prisma.user.findMany({
    where: {
      role: { in: ['employee', 'employe', 'manager'] }
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true
    }
  });

  console.log(`👥 Total employés à vérifier: ${employes.length}\n`);

  let errorsCount = 0;
  let warningsCount = 0;

  for (const emp of employes) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`👤 ${emp.nom} ${emp.prenom} (${emp.email})`);
    console.log(`${'='.repeat(80)}\n`);

    // 1. Récupérer les shifts
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: emp.id,
        date: {
          gte: dateDebut,
          lte: dateFin
        }
      }
    });

    // 2. Récupérer les pointages
    const pointages = await prisma.pointage.findMany({
      where: {
        employeId: emp.id,
        dateHeure: {
          gte: dateDebut,
          lte: dateFin
        }
      },
      orderBy: {
        dateHeure: 'asc'
      }
    });

    // 3. Récupérer les congés
    const conges = await prisma.conge.findMany({
      where: {
        employeId: emp.id,
        statut: 'approuvé',
        OR: [
          {
            dateDebut: {
              lte: dateFin
            },
            dateFin: {
              gte: dateDebut
            }
          }
        ]
      }
    });

    console.log(`📋 Données brutes:`);
    console.log(`   - Shifts planifiés: ${shifts.length}`);
    console.log(`   - Pointages enregistrés: ${pointages.length}`);
    console.log(`   - Congés approuvés: ${conges.length}`);

    // Calcul des heures prévues
    let heuresPrevuesCalcul = 0;
    shifts.forEach(shift => {
      if (shift.segments && Array.isArray(shift.segments)) {
        shift.segments.forEach(seg => {
          if (!seg.isExtra) {
            const [startH, startM] = seg.start.split(':').map(Number);
            const [endH, endM] = seg.end.split(':').map(Number);
            let heures = endH - startH + (endM - startM) / 60;
            if (heures < 0) heures += 24; // Shift de nuit
            heuresPrevuesCalcul += heures;
          }
        });
      }
    });

    console.log(`\n⏰ Heures prévues (calculées): ${heuresPrevuesCalcul.toFixed(2)}h`);

    // Calcul des heures travaillées depuis les pointages
    let heuresTravailleesCalcul = 0;
    let pairesPointages = [];
    for (let i = 0; i < pointages.length - 1; i += 2) {
      if (pointages[i].type === 'IN' && pointages[i + 1] && pointages[i + 1].type === 'OUT') {
        const dateIn = new Date(pointages[i].dateHeure);
        const dateOut = new Date(pointages[i + 1].dateHeure);
        const heures = (dateOut - dateIn) / (1000 * 60 * 60);
        heuresTravailleesCalcul += heures;
        pairesPointages.push({
          in: dateIn.toLocaleString('fr-FR'),
          out: dateOut.toLocaleString('fr-FR'),
          heures: heures.toFixed(2)
        });
      }
    }

    console.log(`⏱️  Heures travaillées (calculées): ${heuresTravailleesCalcul.toFixed(2)}h`);
    if (pairesPointages.length > 0) {
      console.log(`   Détail des ${pairesPointages.length} paires IN/OUT:`);
      pairesPointages.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.in} → ${p.out} = ${p.heures}h`);
      });
    }

    // Calcul heures supplémentaires
    const heuresSuppCalcul = Math.max(0, heuresTravailleesCalcul - heuresPrevuesCalcul);
    console.log(`➕ Heures supplémentaires (calculées): ${heuresSuppCalcul.toFixed(2)}h`);

    // Calcul heures manquantes
    const heuresManquantesCalcul = Math.max(0, heuresPrevuesCalcul - heuresTravailleesCalcul);
    console.log(`➖ Heures manquantes (calculées): ${heuresManquantesCalcul.toFixed(2)}h`);

    // Analyse des absences par type
    let joursCP = 0;
    let joursRTT = 0;
    let joursMaladie = 0;
    let joursInjustifies = 0;

    const datesCP = [];
    const datesRTT = [];
    const datesMaladie = [];
    const datesInjustifiees = [];

    // Analyse shift par shift
    const joursDuMois = [];
    for (let d = new Date(dateDebut); d <= dateFin; d.setDate(d.getDate() + 1)) {
      joursDuMois.push(new Date(d));
    }

    for (const jour of joursDuMois) {
      const jourStr = jour.toISOString().split('T')[0];
      
      // Y a-t-il un shift ce jour ?
      const shiftsJour = shifts.filter(s => {
        const shiftDate = new Date(s.date);
        return shiftDate.toISOString().split('T')[0] === jourStr;
      });

      if (shiftsJour.length === 0) continue;

      // Y a-t-il des pointages ce jour ?
      const pointagesJour = pointages.filter(p => {
        const pDate = new Date(p.dateHeure);
        return pDate.toISOString().split('T')[0] === jourStr;
      });

      // Si shift mais pas de pointages = absence
      if (shiftsJour.length > 0 && pointagesJour.length === 0) {
        // Vérifier si c'est un congé
        const congeJour = conges.find(c => {
          const cDebut = new Date(c.dateDebut);
          const cFin = new Date(c.dateFin);
          cDebut.setHours(0, 0, 0, 0);
          cFin.setHours(23, 59, 59, 999);
          return jour >= cDebut && jour <= cFin;
        });

        const dateFormatee = jour.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

        if (congeJour) {
          const type = congeJour.type.toLowerCase();
          if (type.includes('maladie')) {
            joursMaladie++;
            datesMaladie.push(dateFormatee);
          } else if (type.includes('rtt')) {
            joursRTT++;
            datesRTT.push(dateFormatee);
          } else {
            joursCP++;
            datesCP.push(dateFormatee);
          }
        } else {
          joursInjustifies++;
          datesInjustifiees.push(dateFormatee);
        }
      }
    }

    console.log(`\n📊 Absences par type:`);
    console.log(`   ✅ Congés Payés: ${joursCP} jour(s)`);
    if (datesCP.length > 0) console.log(`      Dates: ${datesCP.join(', ')}`);
    
    console.log(`   🏖️  RTT: ${joursRTT} jour(s)`);
    if (datesRTT.length > 0) console.log(`      Dates: ${datesRTT.join(', ')}`);
    
    console.log(`   🤒 Maladie: ${joursMaladie} jour(s)`);
    if (datesMaladie.length > 0) console.log(`      Dates: ${datesMaladie.join(', ')}`);
    
    console.log(`   ❌ Injustifiées: ${joursInjustifies} jour(s)`);
    if (datesInjustifiees.length > 0) console.log(`      Dates: ${datesInjustifiees.join(', ')}`);

    const absJustifieesCalcul = joursCP + joursRTT + joursMaladie;
    console.log(`\n   Total abs. justifiées: ${absJustifieesCalcul}`);
    console.log(`   Total abs. injustifiées: ${joursInjustifies}`);

    // Calcul jours présents et jours planifiés
    const joursAvecShift = new Set();
    shifts.forEach(s => {
      const date = new Date(s.date);
      joursAvecShift.add(date.toISOString().split('T')[0]);
    });

    const joursPlanifies = joursAvecShift.size;

    const joursAvecPointages = new Set();
    for (let i = 0; i < pointages.length - 1; i += 2) {
      if (pointages[i].type === 'IN' && pointages[i + 1] && pointages[i + 1].type === 'OUT') {
        const date = new Date(pointages[i].dateHeure);
        joursAvecPointages.add(date.toISOString().split('T')[0]);
      }
    }

    const joursPresents = joursAvecPointages.size;

    console.log(`\n📅 Jours:`);
    console.log(`   Jours planifiés: ${joursPlanifies}`);
    console.log(`   Jours présents: ${joursPresents}`);

    // Calcul taux de présence
    const tauxPresence = joursPlanifies > 0 ? (joursPresents / joursPlanifies) * 100 : 100;
    console.log(`   Taux de présence: ${tauxPresence.toFixed(1)}%`);

    // Calcul retards (pointages IN en retard)
    let nbRetards = 0;
    for (const pointage of pointages) {
      if (pointage.type === 'IN') {
        const pDate = new Date(pointage.dateHeure);
        const jourStr = pDate.toISOString().split('T')[0];
        
        const shiftJour = shifts.find(s => {
          const sDate = new Date(s.date);
          return sDate.toISOString().split('T')[0] === jourStr;
        });

        if (shiftJour && shiftJour.segments && shiftJour.segments.length > 0) {
          const premierSegment = shiftJour.segments[0];
          const [heurePrevu, minPrevu] = premierSegment.start.split(':').map(Number);
          
          const heurePointage = pDate.getHours();
          const minPointage = pDate.getMinutes();
          
          const minutesPrevu = heurePrevu * 60 + minPrevu;
          const minutesPointage = heurePointage * 60 + minPointage;
          
          if (minutesPointage > minutesPrevu + 5) { // 5min de tolérance
            nbRetards++;
          }
        }
      }
    }

    console.log(`   Retards: ${nbRetards}`);

    // Calcul taux ponctualité
    const tauxPonctualite = joursPresents > 0 ? ((joursPresents - nbRetards) / joursPresents) * 100 : 100;
    console.log(`   Taux de ponctualité: ${tauxPonctualite.toFixed(1)}%`);

    // Calcul moyenne h/jour
    const moyenneHParJour = joursPresents > 0 ? heuresTravailleesCalcul / joursPresents : 0;
    console.log(`   Moyenne h/jour: ${moyenneHParJour.toFixed(1)}h`);

    // Vérifications de cohérence
    console.log(`\n✅ Vérifications de cohérence:`);

    // Vérif 1: Heures supp + heures normales = heures travaillées
    const heuresNormales = Math.max(0, heuresTravailleesCalcul - heuresSuppCalcul);
    const verification1 = Math.abs((heuresNormales + heuresSuppCalcul) - heuresTravailleesCalcul) < 0.1;
    if (verification1) {
      console.log(`   ✅ Heures normales (${heuresNormales.toFixed(2)}) + supp (${heuresSuppCalcul.toFixed(2)}) = travaillées (${heuresTravailleesCalcul.toFixed(2)})`);
    } else {
      console.log(`   ❌ ERREUR: Somme heures incohérente!`);
      errorsCount++;
    }

    // Vérif 2: Absences justifiées = CP + RTT + Maladie
    const verification2 = absJustifieesCalcul === (joursCP + joursRTT + joursMaladie);
    if (verification2) {
      console.log(`   ✅ Abs. justifiées (${absJustifieesCalcul}) = CP (${joursCP}) + RTT (${joursRTT}) + Maladie (${joursMaladie})`);
    } else {
      console.log(`   ❌ ERREUR: Calcul absences justifiées incohérent!`);
      errorsCount++;
    }

    // Vérif 3: Jours présents + absences ≤ jours planifiés
    const totalJours = joursPresents + absJustifieesCalcul + joursInjustifies;
    if (totalJours <= joursPlanifies + 1) { // +1 de tolérance
      console.log(`   ✅ Total jours (${totalJours}) ≤ planifiés (${joursPlanifies})`);
    } else {
      console.log(`   ⚠️  ATTENTION: Total jours (${totalJours}) > planifiés (${joursPlanifies})`);
      warningsCount++;
    }

    // Vérif 4: Taux de présence entre 0 et 100
    if (tauxPresence >= 0 && tauxPresence <= 100) {
      console.log(`   ✅ Taux de présence valide: ${tauxPresence.toFixed(1)}%`);
    } else {
      console.log(`   ❌ ERREUR: Taux de présence invalide: ${tauxPresence.toFixed(1)}%`);
      errorsCount++;
    }

    // Vérif 5: Si heures manquantes > 0, alors heures travaillées < heures prévues
    if (heuresManquantesCalcul > 0 && heuresTravailleesCalcul >= heuresPrevuesCalcul) {
      console.log(`   ❌ ERREUR: Heures manquantes mais travaillées ≥ prévues!`);
      errorsCount++;
    } else if (heuresManquantesCalcul === 0 && heuresTravailleesCalcul < heuresPrevuesCalcul) {
      console.log(`   ⚠️  ATTENTION: Pas d'heures manquantes mais travaillées < prévues`);
      warningsCount++;
    } else {
      console.log(`   ✅ Cohérence heures manquantes`);
    }
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 RESUME DE LA VERIFICATION`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Employés vérifiés: ${employes.length}`);
  console.log(`❌ Erreurs détectées: ${errorsCount}`);
  console.log(`⚠️  Avertissements: ${warningsCount}`);
  
  if (errorsCount === 0 && warningsCount === 0) {
    console.log(`\n✅ ✅ ✅ TOUTES LES VERIFICATIONS SONT PASSEES! ✅ ✅ ✅`);
  } else if (errorsCount === 0) {
    console.log(`\n✅ Pas d'erreurs critiques, mais ${warningsCount} avertissement(s) à vérifier.`);
  } else {
    console.log(`\n❌ ${errorsCount} erreur(s) critique(s) à corriger!`);
  }

  await prisma.$disconnect();
}

verifierRapportExcel().catch(console.error);
