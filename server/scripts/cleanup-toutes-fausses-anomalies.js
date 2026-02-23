/**
 * Script de nettoyage COMPLET des fausses anomalies
 * 
 * Vérifie chaque anomalie "en_attente" et supprime celles qui sont des faux positifs :
 * 
 * 1. pointage_hors_planning → supprime si un shift existe pour ce jour
 * 2. absence_injustifiee → supprime si des pointages existent pour ce jour business
 * 3. missing_out → supprime si un pointage de sortie existe dans la fenêtre business
 * 4. Doublons → supprime les anomalies dupliquées (même employé, même date, même type)
 * 
 * Usage: cd server && node scripts/cleanup-toutes-fausses-anomalies.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const { isEntree, isSortie } = require('../utils/pointageTypeUtils');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// Business day: 05:00 Paris → 04:59:59 J+1 Paris
function getBusinessDayBoundsUTC(dateStr) {
  const CUTOFF = 5;
  const midday = new Date(`${dateStr}T12:00:00Z`);
  const parisStr = midday.toLocaleString('en-US', { timeZone: 'Europe/Paris', hour12: false });
  const parisHour = new Date(parisStr).getHours();
  const utcHour = midday.getUTCHours();
  const offsetHours = parisHour - utcHour;

  const start = new Date(`${dateStr}T${String(CUTOFF).padStart(2, '0')}:00:00.000Z`);
  start.setUTCHours(start.getUTCHours() - offsetHours);

  const nextDay = new Date(`${dateStr}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  const end = new Date(`${nextDayStr}T${String(CUTOFF).padStart(2, '0')}:00:00.000Z`);
  end.setUTCHours(end.getUTCHours() - offsetHours);
  end.setUTCMilliseconds(-1);

  return { start, end };
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  CLEANUP COMPLET DES FAUSSES ANOMALIES`);
  console.log(`  ${DRY_RUN ? '🔍 MODE DRY-RUN (aucune suppression)' : '🗑️  MODE RÉEL (suppression effective)'}`);
  console.log(`${'='.repeat(60)}\n`);

  // Récupérer TOUTES les anomalies en attente
  const anomalies = await prisma.anomalie.findMany({
    where: { statut: 'en_attente' },
    include: { employe: { select: { nom: true, prenom: true } } },
    orderBy: [{ type: 'asc' }, { date: 'asc' }]
  });

  console.log(`📋 Total anomalies en_attente: ${anomalies.length}\n`);

  const stats = {
    total: anomalies.length,
    supprimees: 0,
    conservees: 0,
    parType: {}
  };
  const suppressions = [];
  const conserves = [];

  // Regrouper par type pour l'affichage
  const parType = {};
  anomalies.forEach(a => {
    if (!parType[a.type]) parType[a.type] = [];
    parType[a.type].push(a);
  });

  console.log(`📊 Répartition par type:`);
  Object.entries(parType).forEach(([type, list]) => {
    console.log(`   ${type}: ${list.length}`);
  });
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  // 1. POINTAGE_HORS_PLANNING : faux si un shift existe ce jour
  // ═══════════════════════════════════════════════════════════════
  const horsPlanning = parType['pointage_hors_planning'] || [];
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🔍 Vérification pointage_hors_planning (${horsPlanning.length})`);
  console.log(`${'─'.repeat(50)}`);

  for (const a of horsPlanning) {
    const dateStr = a.date.toISOString().split('T')[0];
    const shift = await prisma.shift.findFirst({
      where: {
        employeId: a.employeId,
        date: new Date(`${dateStr}T00:00:00.000Z`),
        type: { in: ['travail', 'présence', 'presence'] }
      }
    });

    if (shift) {
      suppressions.push({ anomalie: a, raison: `Shift #${shift.id} existe ce jour` });
      console.log(`  ❌ FAUX - ${a.employe?.prenom} ${a.employe?.nom} ${dateStr} → shift #${shift.id} existe`);
    } else {
      conserves.push(a);
      console.log(`  ✅ OK   - ${a.employe?.prenom} ${a.employe?.nom} ${dateStr} → pas de shift`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. ABSENCE_INJUSTIFIEE : faux si des pointages existent ce jour business
  // ═══════════════════════════════════════════════════════════════
  const absences = parType['absence_injustifiee'] || [];
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🔍 Vérification absence_injustifiee (${absences.length})`);
  console.log(`${'─'.repeat(50)}`);

  for (const a of absences) {
    const dateStr = a.date.toISOString().split('T')[0];
    const { start, end } = getBusinessDayBoundsUTC(dateStr);

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: a.employeId,
        horodatage: { gte: start, lte: end }
      }
    });

    const entrees = pointages.filter(p => isEntree(p.type));

    if (entrees.length > 0) {
      suppressions.push({ anomalie: a, raison: `${pointages.length} pointages trouvés (${entrees.length} entrées)` });
      console.log(`  ❌ FAUX - ${a.employe?.prenom} ${a.employe?.nom} ${dateStr} → ${pointages.length} pointages existent`);
    } else {
      // Vérifier aussi s'il y a un congé validé ce jour
      const conge = await prisma.conge.findFirst({
        where: {
          userId: a.employeId,
          statut: { in: ['approuve', 'validé', 'valide'] },
          dateDebut: { lte: new Date(`${dateStr}T23:59:59.999Z`) },
          dateFin: { gte: new Date(`${dateStr}T00:00:00.000Z`) }
        }
      });

      if (conge) {
        suppressions.push({ anomalie: a, raison: `Congé validé #${conge.id} couvre ce jour` });
        console.log(`  ❌ FAUX - ${a.employe?.prenom} ${a.employe?.nom} ${dateStr} → congé validé #${conge.id}`);
      } else {
        conserves.push(a);
        console.log(`  ✅ OK   - ${a.employe?.prenom} ${a.employe?.nom} ${dateStr} → aucun pointage ni congé`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. MISSING_OUT : faux si un pointage sortie existe dans la fenêtre
  // ═══════════════════════════════════════════════════════════════
  const missingOuts = parType['missing_out'] || [];
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🔍 Vérification missing_out (${missingOuts.length})`);
  console.log(`${'─'.repeat(50)}`);

  for (const a of missingOuts) {
    const dateStr = a.date.toISOString().split('T')[0];
    const { start, end } = getBusinessDayBoundsUTC(dateStr);

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: a.employeId,
        horodatage: { gte: start, lte: end }
      },
      orderBy: { horodatage: 'asc' }
    });

    const sorties = pointages.filter(p => isSortie(p.type));
    const entrees = pointages.filter(p => isEntree(p.type));

    // Si autant de sorties que d'entrées → pas de missing_out
    if (sorties.length >= entrees.length && entrees.length > 0) {
      suppressions.push({ anomalie: a, raison: `${entrees.length} entrées / ${sorties.length} sorties → complet` });
      console.log(`  ❌ FAUX - ${a.employe?.prenom} ${a.employe?.nom} ${dateStr} → ${entrees.length}in/${sorties.length}out complet`);
    } else {
      conserves.push(a);
      const detail = `${entrees.length}in/${sorties.length}out`;
      console.log(`  ✅ OK   - ${a.employe?.prenom} ${a.employe?.nom} ${dateStr} → ${detail} incomplet`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. DOUBLONS : même employé + même date + même type → garder le plus récent
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🔍 Vérification doublons`);
  console.log(`${'─'.repeat(50)}`);

  const idsDejaSupprimes = new Set(suppressions.map(s => s.anomalie.id));
  const restantes = anomalies.filter(a => !idsDejaSupprimes.has(a.id));
  
  const doublonMap = {};
  restantes.forEach(a => {
    const dateStr = a.date.toISOString().split('T')[0];
    const key = `${a.employeId}_${dateStr}_${a.type}`;
    if (!doublonMap[key]) doublonMap[key] = [];
    doublonMap[key].push(a);
  });

  let doublonsSup = 0;
  Object.entries(doublonMap).forEach(([key, dupes]) => {
    if (dupes.length > 1) {
      // Garder le plus récent, supprimer les autres
      dupes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const garder = dupes[0];
      for (let i = 1; i < dupes.length; i++) {
        const a = dupes[i];
        suppressions.push({ anomalie: a, raison: `Doublon de #${garder.id}` });
        doublonsSup++;
        console.log(`  ❌ DOUBLON - ${a.employe?.prenom} ${a.employe?.nom} ${a.date.toISOString().split('T')[0]} ${a.type} (#${a.id} → doublon de #${garder.id})`);
      }
    }
  });
  console.log(`  ${doublonsSup === 0 ? '✅ Aucun doublon' : `${doublonsSup} doublons trouvés`}`);

  // ═══════════════════════════════════════════════════════════════
  // 5. Autres types — juste les lister
  // ═══════════════════════════════════════════════════════════════
  const typesVerifies = ['pointage_hors_planning', 'absence_injustifiee', 'missing_out'];
  const autresTypes = Object.entries(parType).filter(([t]) => !typesVerifies.includes(t));
  
  if (autresTypes.length > 0) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📋 Autres types (non vérifiés automatiquement)`);
    console.log(`${'─'.repeat(50)}`);
    autresTypes.forEach(([type, list]) => {
      console.log(`  ${type}: ${list.length} anomalie(s)`);
      list.forEach(a => {
        const dateStr = a.date.toISOString().split('T')[0];
        console.log(`    → ${a.employe?.prenom} ${a.employe?.nom} ${dateStr}: ${(a.description || '').substring(0, 80)}`);
        conserves.push(a);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // EXÉCUTION DES SUPPRESSIONS
  // ═══════════════════════════════════════════════════════════════
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  RÉSUMÉ`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Total anomalies en_attente : ${anomalies.length}`);
  console.log(`  🗑️  À supprimer (faux positifs) : ${suppressions.length}`);
  console.log(`  ✅ À conserver (légitimes)       : ${anomalies.length - suppressions.length}`);
  console.log('');

  // Détail par raison
  const parRaison = {};
  suppressions.forEach(s => {
    const cat = s.anomalie.type;
    if (!parRaison[cat]) parRaison[cat] = 0;
    parRaison[cat]++;
  });
  console.log(`  Suppressions par type:`);
  Object.entries(parRaison).forEach(([type, count]) => {
    console.log(`    ${type}: ${count}`);
  });

  if (!DRY_RUN && suppressions.length > 0) {
    const ids = suppressions.map(s => s.anomalie.id);
    const result = await prisma.anomalie.deleteMany({
      where: { id: { in: ids } }
    });
    console.log(`\n  ✅ ${result.count} anomalies supprimées avec succès !`);
  } else if (DRY_RUN) {
    console.log(`\n  🔍 Dry-run terminé — aucune modification effectuée`);
  } else {
    console.log(`\n  ✅ Aucune fausse anomalie détectée`);
  }

  // Afficher les anomalies restantes
  const restantesFinales = anomalies.filter(a => !new Set(suppressions.map(s => s.anomalie.id)).has(a.id));
  if (restantesFinales.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ANOMALIES RESTANTES À TRAITER (${restantesFinales.length})`);
    console.log(`${'='.repeat(60)}`);
    restantesFinales.forEach(a => {
      const dateStr = a.date.toISOString().split('T')[0];
      console.log(`  #${a.id} | ${a.type.padEnd(25)} | ${(a.employe?.prenom + ' ' + a.employe?.nom).padEnd(25)} | ${dateStr} | ${(a.description || '').substring(0, 60)}`);
    });
  }

  console.log('');
}

main()
  .catch(err => { console.error('💥 Erreur:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
