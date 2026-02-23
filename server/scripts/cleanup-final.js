// Nettoyage final — Suppression de TOUTES les fausses anomalies en production
// Analyse chaque anomalie en_attente et vérifie si elle est légitime

const prisma = require('../prisma/client');
const { parseSegments } = require('../utils/segmentUtils');
const { filtrerEntrees, filtrerSorties } = require('../utils/pointageTypeUtils');
const { getBusinessDayBoundsUTC, BUSINESS_DAY_CUTOFF_HOUR } = require('../utils/businessDayUtils');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(DRY_RUN ? '🔍 MODE DRY-RUN (aucune suppression)\n' : '🗑️ MODE SUPPRESSION\n');

  const anomalies = await prisma.anomalie.findMany({
    where: { statut: 'en_attente' },
    orderBy: [{ type: 'asc' }, { date: 'asc' }]
  });

  console.log(`Total anomalies en_attente: ${anomalies.length}\n`);

  const toDelete = [];
  const toKeep = [];

  for (const a of anomalies) {
    const dateStr = a.date?.toISOString().split('T')[0];
    const reason = await analyzeAnomalie(a, dateStr);
    
    if (reason) {
      toDelete.push({ id: a.id, type: a.type, empId: a.employeId, date: dateStr, reason });
    } else {
      toKeep.push({ id: a.id, type: a.type, empId: a.employeId, date: dateStr });
    }
  }

  // Résumé
  console.log(`\n${'='.repeat(70)}`);
  console.log(`FAUSSES ANOMALIES À SUPPRIMER: ${toDelete.length}`);
  console.log(`ANOMALIES LÉGITIMES À GARDER:  ${toKeep.length}`);
  console.log(`${'='.repeat(70)}\n`);

  // Détail des suppressions par type
  const parType = {};
  toDelete.forEach(d => {
    if (!parType[d.type]) parType[d.type] = [];
    parType[d.type].push(d);
  });
  for (const [type, items] of Object.entries(parType)) {
    console.log(`🗑️ ${type} (${items.length}):`);
    items.forEach(d => console.log(`   #${d.id} emp${d.empId} ${d.date} → ${d.reason}`));
  }

  // Détail des anomalies gardées
  const keepParType = {};
  toKeep.forEach(k => {
    if (!keepParType[k.type]) keepParType[k.type] = [];
    keepParType[k.type].push(k);
  });
  console.log(`\n✅ Anomalies gardées:`);
  for (const [type, items] of Object.entries(keepParType)) {
    console.log(`   ${type}: ${items.length}`);
  }

  // Supprimer
  if (!DRY_RUN && toDelete.length > 0) {
    const ids = toDelete.map(d => d.id);
    const result = await prisma.anomalie.deleteMany({
      where: { id: { in: ids } }
    });
    console.log(`\n✅ ${result.count} fausses anomalies supprimées.`);
  }

  await prisma.$disconnect();
}

async function analyzeAnomalie(a, dateStr) {
  const empId = a.employeId;

  // Récupérer shift et pointages pour cette date
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: empId,
      date: new Date(`${dateStr}T00:00:00.000Z`),
      type: { in: ['travail', 'présence', 'presence'] }
    }
  });

  const { start: startUTC, end: endUTC } = getBusinessDayBoundsUTC(dateStr);
  // Étendre pour shifts de nuit
  const endExtended = new Date(endUTC.getTime() + 6 * 60 * 60 * 1000);
  
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: empId,
      horodatage: { gte: startUTC, lt: endExtended }
    },
    orderBy: { horodatage: 'asc' }
  });

  const entrees = filtrerEntrees(pointages);
  const sorties = filtrerSorties(pointages);

  // Vérifier congé approuvé
  const conge = await prisma.conge.findFirst({
    where: {
      userId: empId,
      statut: { in: ['approuve', 'approuvé'] },
      dateDebut: { lte: new Date(`${dateStr}T23:59:59Z`) },
      dateFin: { gte: new Date(`${dateStr}T00:00:00Z`) }
    }
  });

  const segments = shift ? parseSegments(shift.segments) : [];
  const workSegments = segments.filter(seg => {
    const t = seg.type?.toLowerCase();
    return t !== 'pause' && t !== 'break' && !seg.isExtra;
  });

  switch (a.type) {
    // ═══════════════════════════════════════════════════════════════
    // ABSENCE INJUSTIFIÉE
    // ═══════════════════════════════════════════════════════════════
    case 'absence_injustifiee': {
      // Faux si: l'employé a des pointages, OU a un congé approuvé
      if (entrees.length > 0) {
        return `Faux: ${entrees.length} pointage(s) d'entrée trouvé(s)`;
      }
      if (conge) {
        return `Faux: congé approuvé (${conge.dateDebut?.toISOString().split('T')[0]} → ${conge.dateFin?.toISOString().split('T')[0]})`;
      }
      if (!shift) {
        return `Faux: aucun shift trouvé pour cette date`;
      }
      // Vérifier si le shift est uniquement des segments extra
      if (workSegments.length === 0 && segments.some(s => s.isExtra)) {
        return `Faux: shift uniquement extra (pas obligatoire)`;
      }
      return null; // Légitime
    }

    // ═══════════════════════════════════════════════════════════════
    // EXTRA POTENTIEL
    // ═══════════════════════════════════════════════════════════════
    case 'extra_potentiel': {
      if (!shift) return `Faux: aucun shift`;
      
      const raison = a.details?.raison;
      
      if (raison === 'depart_tardif') {
        // Vérifier le calcul avec la bonne logique midnight
        if (sorties.length === 0) return `Faux: aucune sortie`;
        const derniereSortie = sorties[sorties.length - 1];
        const sortieParisStr = new Date(derniereSortie.horodatage)
          .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' });
        const [sH, sM] = sortieParisStr.split(':').map(Number);
        let sortieMin = sH * 60 + sM;

        const lastSeg = workSegments[workSegments.length - 1];
        if (!lastSeg) return `Faux: pas de segment de travail`;
        const endStr = lastSeg.end || lastSeg.fin;
        const startStr = lastSeg.start || lastSeg.debut;
        const [eH, eM] = endStr.split(':').map(Number);
        let endMin = eH * 60 + eM;
        const [stH, stM] = startStr.split(':').map(Number);
        const startMin = stH * 60 + stM;
        
        // Ajustement midnight
        if (endMin <= startMin) endMin += 1440;
        const crossesMidnight = endMin >= 1440;
        if (crossesMidnight && sortieMin < startMin) sortieMin += 1440;

        const retardMinutes = sortieMin - endMin;
        if (retardMinutes < 45) {
          return `Faux: seulement ${retardMinutes}min après fin (seuil 45min) [sortie ${sortieParisStr}, fin shift ${endStr}]`;
        }
        // Vérifier si la valeur stockée est aberrante (bug midnight)
        const storedMinutes = a.details?.minutesApres;
        if (storedMinutes && Math.abs(storedMinutes - retardMinutes) > 60) {
          return `Faux: calcul bugé (stocké ${storedMinutes}min, réel ${retardMinutes}min)`;
        }
      }
      
      if (raison === 'arrivee_avance') {
        if (entrees.length === 0) return `Faux: aucune entrée`;
        const premiereEntree = entrees[0];
        const entreeParisStr = new Date(premiereEntree.horodatage)
          .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' });
        const [eH, eM] = entreeParisStr.split(':').map(Number);
        let entreeMin = eH * 60 + eM;

        const firstSeg = workSegments[0];
        if (!firstSeg) return `Faux: pas de segment de travail`;
        const startStr = firstSeg.start || firstSeg.debut;
        const [stH, stM] = startStr.split(':').map(Number);
        const startMin = stH * 60 + stM;

        let avance = startMin - entreeMin;
        if (avance < -720 && startMin < BUSINESS_DAY_CUTOFF_HOUR * 60) avance += 1440;

        if (avance < 45 || avance > 240) {
          return `Faux: avance réelle ${avance}min (seuil 45-240) [entrée ${entreeParisStr}, début ${startStr}]`;
        }
        const storedMinutes = a.details?.minutesEnAvance;
        if (storedMinutes && Math.abs(storedMinutes - avance) > 60) {
          return `Faux: calcul bugé (stocké ${storedMinutes}min, réel ${avance}min)`;
        }
      }

      if (raison === 'pause_non_prise') {
        // Vérifié par checkPauseNonPrise — si le shift n'a qu'1 segment, c'est faux
        if (workSegments.length < 2 && !segments.some(s => s.type?.toLowerCase() === 'pause')) {
          return `Faux: shift 1 segment sans pause prévue`;
        }
      }

      // Bug setHours UTC dans pointageRoutes (bug critique #6/#7)
      // Si l'anomalie a été créée par le temps réel (pas le scheduler)
      if (!a.details?.detectePar && !a.details?.detecteAutomatiquement) {
        // Vérifier avec le bon calcul
        if (raison === 'depart_tardif' || (!raison && a.description?.includes('après la fin'))) {
          // Recalculer proprement
          if (sorties.length > 0 && workSegments.length > 0) {
            const derniereSortie = sorties[sorties.length - 1];
            const sortieParisStr = new Date(derniereSortie.horodatage)
              .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' });
            const [sH, sM] = sortieParisStr.split(':').map(Number);
            let sortieMin = sH * 60 + sM;
            const lastSeg = workSegments[workSegments.length - 1];
            const endStr = lastSeg.end || lastSeg.fin;
            const startStr = lastSeg.start || lastSeg.debut;
            const [eH, eM] = endStr.split(':').map(Number);
            let endMin = eH * 60 + eM;
            const [stH2, stM2] = startStr.split(':').map(Number);
            if (endMin <= stH2 * 60 + stM2) endMin += 1440;
            if (endMin >= 1440 && sortieMin < stH2 * 60 + stM2) sortieMin += 1440;
            const retard = sortieMin - endMin;
            if (retard < 45) {
              return `Faux (bug UTC temps réel): retard réel ${retard}min < 45min [sortie ${sortieParisStr}, fin ${endStr}]`;
            }
          }
        }
        if (raison === 'arrivee_avance' || (!raison && a.description?.includes('en avance'))) {
          if (entrees.length > 0 && workSegments.length > 0) {
            const premiereEntree = entrees[0];
            const entreeParisStr = new Date(premiereEntree.horodatage)
              .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' });
            const [eH, eM] = entreeParisStr.split(':').map(Number);
            let entreeMin = eH * 60 + eM;
            const firstSeg = workSegments[0];
            const startStr = firstSeg.start || firstSeg.debut;
            const [stH, stM] = startStr.split(':').map(Number);
            let avance = stH * 60 + stM - entreeMin;
            if (avance < -720) avance += 1440;
            if (avance < 45 || avance > 240) {
              return `Faux (bug UTC temps réel): avance réelle ${avance}min (pas dans 45-240) [entrée ${entreeParisStr}, début ${startStr}]`;
            }
          }
        }
      }

      return null; // Légitime ou incertain → garder
    }

    // ═══════════════════════════════════════════════════════════════
    // PAUSE EXCESSIVE
    // ═══════════════════════════════════════════════════════════════
    case 'pause_excessive': {
      if (!shift) return `Faux: aucun shift`;
      
      // Si shift 1 segment = pas de pause prévue → toujours faux positif
      if (workSegments.length < 2 && !segments.some(s => s.type?.toLowerCase() === 'pause')) {
        return `Faux: shift 1 segment, aucune pause prévue (bug default 60min)`;
      }

      // Vérifier si la "pause" est en fait le gap entre 2 segments de coupure
      if (workSegments.length >= 2) {
        let totalGap = 0;
        for (let i = 0; i < workSegments.length - 1; i++) {
          const segEnd = workSegments[i].end || workSegments[i].fin;
          const segStart = workSegments[i + 1].start || workSegments[i + 1].debut;
          const [eH, eM] = segEnd.split(':').map(Number);
          const [sH, sM] = segStart.split(':').map(Number);
          let gap = (sH * 60 + sM) - (eH * 60 + eM);
          if (gap < 0) gap += 1440;
          totalGap += gap;
        }
        // La pause réelle reportée dans l'anomalie
        const pauseReelle = a.details?.pauseDetectee || 0;
        const descMatch = a.description?.match(/Durée réelle (\d+)min/);
        const dureeReelle = descMatch ? parseInt(descMatch[1]) : pauseReelle;
        
        // Si la durée "excessive" est inférieure ou proche du gap planifié → faux
        if (dureeReelle <= totalGap + 15) {
          return `Faux: "pause" de ${dureeReelle}min = gap planifié entre segments (${totalGap}min)`;
        }
      }

      return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // MISSING OUT (sortie manquante)
    // ═══════════════════════════════════════════════════════════════
    case 'missing_out': {
      // Faux si le nombre d'entrées = nombre de sorties maintenant
      if (entrees.length <= sorties.length) {
        return `Faux: ${entrees.length} entrées, ${sorties.length} sorties (équilibré)`;
      }
      // Vérifier s'il y a déjà une cloture_auto pour cette date → doublon
      const cloture = await prisma.anomalie.findFirst({
        where: {
          employeId: empId,
          type: 'cloture_auto_journee',
          date: { gte: startUTC, lt: endUTC }
        }
      });
      if (cloture) {
        return `Faux: doublon avec cloture_auto_journee #${cloture.id}`;
      }
      return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // MISSING OUT PROLONGÉ
    // ═══════════════════════════════════════════════════════════════
    case 'missing_out_prolonge': {
      if (entrees.length <= sorties.length) {
        return `Faux: ${entrees.length} entrées, ${sorties.length} sorties (équilibré)`;
      }
      // Doublon avec cloture_auto
      const cloture = await prisma.anomalie.findFirst({
        where: {
          employeId: empId,
          type: 'cloture_auto_journee',
          date: { gte: startUTC, lt: endUTC }
        }
      });
      if (cloture) {
        return `Faux: doublon avec cloture_auto_journee #${cloture.id}`;
      }
      return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // POINTAGE HORS PLANNING
    // ═══════════════════════════════════════════════════════════════
    case 'pointage_hors_planning': {
      // Faux si un shift existe maintenant (ajouté après le pointage)
      if (shift) {
        return `Faux: shift #${shift.id} existe maintenant`;
      }
      return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // SEGMENT NON POINTÉ
    // ═══════════════════════════════════════════════════════════════
    case 'segment_non_pointe': {
      // Faux si des pointages couvrent cette période
      if (entrees.length > 0 && sorties.length > 0) {
        return `Faux: ${entrees.length} entrées et ${sorties.length} sorties trouvées`;
      }
      if (!shift) return `Faux: aucun shift`;
      return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // HORS PLAGE (IN/OUT) — générés par l'ancien comparisonController
    // ═══════════════════════════════════════════════════════════════
    case 'hors_plage_in_critique':
    case 'hors_plage_out_critique': {
      // Ces anomalies sont générées par le système de comparaison.
      // Vérifier si l'écart est dû à un shift multi-segment  
      // (arrivée le matin pour un shift soir = badge pour un AUTRE shift)
      if (!shift) return `Faux: aucun shift`;
      
      // Si l'employé a un shift coupure et que le "hors plage" est 
      // en fait l'arrivée pour le premier segment
      if (workSegments.length >= 2) {
        return `Faux probable: shift coupure ${workSegments.length} segments, pointage lié à un autre segment`;
      }
      
      // Vérifier hors_plage_out avec le bon calcul midnight
      if (a.type === 'hors_plage_out_critique' && sorties.length > 0) {
        const derniereSortie = sorties[sorties.length - 1];
        const sortieParisStr = new Date(derniereSortie.horodatage)
          .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' });
        const [sH, sM] = sortieParisStr.split(':').map(Number);
        let sortieMin = sH * 60 + sM;
        const lastSeg = workSegments[workSegments.length - 1];
        if (lastSeg) {
          const endStr = lastSeg.end || lastSeg.fin;
          const startStr = lastSeg.start || lastSeg.debut;
          const [eH, eM] = endStr.split(':').map(Number);
          let endMin = eH * 60 + eM;
          const [stH, stM] = startStr.split(':').map(Number);
          if (endMin <= stH * 60 + stM) endMin += 1440;
          if (endMin >= 1440 && sortieMin < stH * 60 + stM) sortieMin += 1440;
          const diff = Math.abs(sortieMin - endMin);
          if (diff < 90) {
            return `Faux: sortie à ${diff}min de la fin du shift (< 90min seuil hors_plage)`;
          }
        }
      }
      
      return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // PRÉSENCE NON PRÉVUE
    // ═══════════════════════════════════════════════════════════════  
    case 'presence_non_prevue': {
      // Faux si un shift existe maintenant
      if (shift) {
        return `Faux: shift #${shift.id} existe maintenant`;
      }
      return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // CLÔTURE AUTO JOURNÉE — TOUJOURS GARDER (légitimes par définition)
    // ═══════════════════════════════════════════════════════════════
    case 'cloture_auto_journee': {
      // Faux si sortie existe maintenant
      if (entrees.length <= sorties.length) {
        return `Faux: ${sorties.length} sortie(s) trouvée(s), plus de missing out`;
      }
      return null;
    }

    default:
      return null; // Type inconnu → garder par précaution
  }
}

main().catch(e => { console.error(e); process.exit(1); });
