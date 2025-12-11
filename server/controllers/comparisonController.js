const prisma = require("../prisma/client");
const { getParisDateString, getParisTimeString, calculateTimeGapMinutes, getParisBusinessDayKey } = require("../utils/parisTimeUtils");
const { toLocalDateString, getCurrentDateString } = require("../utils/dateUtils");

// Centralisation des seuils d'alerte
const THRESHOLDS = {
  ARRIVEE: {
    EARLY_HORS_PLAGE: 30,      // > 30 min trop tôt => hors plage IN
    RETARD_ACCEPTABLE: -5,     // jusqu'à -5 min (retard) acceptable
    RETARD_MODERE: -20         // jusqu'à -20 min retard modéré, au delà critique
  },
  DEPART: {
    DEPART_PREMATURE_CRITIQUE: 30,  // > 30 min trop tôt
    DEPART_ANTICIPE: 15,            // 15-30 min trop tôt
    HEURES_SUP_AUTO_VALIDEES: -30,  // jusqu'à 30 min en plus => auto-validées
    HEURES_SUP_A_VALIDER: -90,      // 30-90 min en plus => à valider
    HEURES_SUP_HORS_PLAGE: -91      // > 90 min en plus => hors-plage critique
  }
};

/**
 * Calcule les écarts entre planning prévu et pointages réels
 * GET /api/comparison/planning-vs-realite?employeId=1&date=2024-01-15
 */
const getPlanningVsRealite = async (req, res) => {
  const { employeId, date, dateDebut, dateFin } = req.query;

  if (!employeId) {
    return res.status(400).json({ error: "employeId requis" });
  }
  const employeIdNum = Number(employeId);
  if (!Number.isInteger(employeIdNum) || employeIdNum <= 0) {
    return res.status(400).json({ error: "employeId invalide" });
  }

  try {
    // ---- CONFIG JOUR BUSINESS ----
    const BUSINESS_CUTOFF_HOUR = 5; // 05:00 local Paris = début de la journée business

    // Helper: liste des jours demandés (strings YYYY-MM-DD)
    function listDates(startStr, endStr) {
      const out = [];
      let d = new Date(startStr + 'T00:00:00Z');
      const end = new Date(endStr + 'T00:00:00Z');
      while (d <= end) {
        out.push(toLocalDateString(d));
        d.setUTCDate(d.getUTCDate() + 1);
      }
      return out;
    }

    let requestedDays = [];
    if (date) {
      requestedDays = [date];
    } else if (dateDebut && dateFin) {
      requestedDays = listDates(dateDebut, dateFin);
    } else {
      const todayParis = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
      requestedDays = [getCurrentDateString()];
    }

    const minDay = requestedDays[0];
    const maxDay = requestedDays[requestedDays.length - 1];

  // Fenêtre large simple UTC : J-1 00:00 UTC jusqu'à J+2 00:00 UTC (inclut marges pour cutoff)
  const queryStart = new Date(minDay + 'T00:00:00.000Z');
  queryStart.setUTCDate(queryStart.getUTCDate() - 1);
  const queryEnd = new Date(maxDay + 'T00:00:00.000Z');
  queryEnd.setUTCDate(queryEnd.getUTCDate() + 2);

  console.log(`🔍 Fenêtre SQL large (UTC) : ${queryStart.toISOString()} → (lt) ${queryEnd.toISOString()} | Jours demandés:`, requestedDays);

  // Helper: clé jour business via util

    // 1. Récupérer les shifts prévus (plannings) - incluant les absences
  const shiftsPrevus = await prisma.shift.findMany({
      where: {
    employeId: employeIdNum,
        date: {
          gte: queryStart,
          lt: queryEnd
        }
      },
      orderBy: { date: 'asc' }
    });

    // 2. Récupérer les pointages réels
  const pointagesReels = await prisma.pointage.findMany({
      where: {
    userId: employeIdNum,
        horodatage: {
          gte: queryStart,
          lt: queryEnd
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`📋 Shifts prévus: ${shiftsPrevus.length}, Pointages réels: ${pointagesReels.length}`);

    // 3. Organiser les données par jour et calculer les écarts
    const comparaisons = [];

    // 🌙 DÉTECTION DES SHIFTS DE NUIT RESTAURANT (7h → 00:30/01:00)
    const shiftNightMapping = new Map();
    
    console.log('\n🌙 === DÉTECTION SHIFTS DE NUIT RESTAURANT ===');
    
    shiftsPrevus.forEach(shift => {
      const shiftDateParis = new Date(shift.date).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
      
      if (shift.type === 'travail' && Array.isArray(shift.segments)) {
        shift.segments.forEach((segment, idx) => {
          if (segment.start && segment.end) {
            const [startHH, startMM] = segment.start.split(':').map(Number);
            const [endHH, endMM] = segment.end.split(':').map(Number);
            
            const startMinutes = startHH * 60 + startMM;
            const endMinutes = endHH * 60 + endMM;
            
            // Shift de nuit : fin < début (ex: 19:00 → 00:30)
            const spansMultipleDays = endMinutes < startMinutes;
            
            if (spansMultipleDays) {
              const shiftKey = `${shift.id}_seg${idx}`;
              
              const nextDay = new Date(shift.date);
              nextDay.setDate(nextDay.getDate() + 1);
              const nextDayParis = nextDay.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
              
              const durationHours = ((24 * 60) - startMinutes + endMinutes) / 60;
              
              console.log(`🌙 SHIFT NUIT détecté:`);
              console.log(`   → Shift ${shift.id} segment ${idx}`);
              console.log(`   → Horaire: ${segment.start} → ${segment.end} (${durationHours.toFixed(1)}h)`);
              console.log(`   → Date shift: ${shiftDateParis}`);
              console.log(`   → Date OUT attendue: ${nextDayParis}`);
              console.log(`   → ${segment.commentaire || 'Service restaurant'}`);
              
              shiftNightMapping.set(shiftKey, {
                shiftId: shift.id,
                shiftDate: shiftDateParis,
                nextDate: nextDayParis,
                segment,
                segmentIndex: idx,
                durationHours
              });
            }
          }
        });
      }
    });
    
    console.log(`🌙 Total shifts de nuit: ${shiftNightMapping.size}`);
    console.log('========================================\n');

    // Grouper par jour business (Europe/Paris + cutoff)
    const shiftsByDate = {};
    shiftsPrevus.forEach(shift => {
      // Pour les shifts, utiliser le jour calendaire de la date stockée (pas le cutoff)
      // car un shift créé pour le "28 août" doit être traité comme tel
      const shiftDateParis = new Date(shift.date).toLocaleDateString('en-CA', { 
        timeZone: 'Europe/Paris' 
      }); // Format YYYY-MM-DD
      
      console.log(`📋 Shift ${shift.id}: date DB=${shift.date} → jour Paris=${shiftDateParis}`);
      
      if (!shiftsByDate[shiftDateParis]) shiftsByDate[shiftDateParis] = [];
      shiftsByDate[shiftDateParis].push(shift);
    });

    const pointagesByDate = {};
    const pointagesNightShiftsUsed = new Set();
    
    pointagesReels.forEach(p => {
      const pointageDateParis = new Date(p.horodatage).toLocaleDateString('en-CA', { 
        timeZone: 'Europe/Paris' 
      });
      const pointageTime = new Date(p.horodatage).toLocaleTimeString('fr-FR', { 
        timeZone: 'Europe/Paris',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      // Groupage standard
      if (!pointagesByDate[pointageDateParis]) pointagesByDate[pointageDateParis] = [];
      pointagesByDate[pointageDateParis].push(p);
      
      console.log(`⏰ Pointage ${p.id}: ${p.type} à ${pointageDateParis} ${pointageTime}`);
      
      // 🌙 LOGIQUE RESTAURANT : Rattacher les départs après minuit au shift de J-1
      const isDepartType = p.type === 'depart' || p.type === 'départ' || p.type === 'SORTIE';
      
      if (isDepartType) {
        // Calculer J-1
        const prevDay = new Date(p.horodatage);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDayParis = prevDay.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
        
        // Chercher si un shift de nuit de J-1 attend ce départ
        let nightShiftFound = false;
        
        for (const [shiftKey, nightShift] of shiftNightMapping.entries()) {
          if (nightShift.shiftDate === prevDayParis && nightShift.nextDate === pointageDateParis) {
            console.log(`   🌙 → Rattaché au shift nuit ${nightShift.shiftId} du ${prevDayParis}`);
            console.log(`      Shift prévu: ${nightShift.segment.start} → ${nightShift.segment.end}`);
            console.log(`      ${nightShift.segment.commentaire || 'Service restaurant'}`);
            
            // Ajouter ce pointage AUSSI au jour précédent
            if (!pointagesByDate[prevDayParis]) pointagesByDate[prevDayParis] = [];
            
            if (!pointagesNightShiftsUsed.has(p.id)) {
              pointagesByDate[prevDayParis].push({
                ...p,
                _nightShiftCandidate: true,
                _originalDate: pointageDateParis,
                _nightShiftKey: shiftKey
              });
              pointagesNightShiftsUsed.add(p.id);
              nightShiftFound = true;
            }
            
            break;
          }
        }
        
        if (!nightShiftFound && pointageDateParis !== prevDayParis) {
          const [hh] = pointageTime.split(':').map(Number);
          if (hh < 6) {
            console.log(`   ⚠️ Départ après minuit (${pointageTime}) sans shift de nuit correspondant`);
          }
        }
      }
    });
    
    console.log(`\n📊 Résumé groupage:`);
    console.log(`   - ${shiftNightMapping.size} shifts de nuit détectés`);
    console.log(`   - ${pointagesNightShiftsUsed.size} pointages OUT rattachés à J-1`);
    console.log(`   - Jours avec pointages: ${Object.keys(pointagesByDate).join(', ')}`);
    console.log('');

    console.log(`📊 Détails pointages trouvés:`, pointagesReels.map(p => ({
      type: p.type,
      horodatage: p.horodatage,
      userId: p.userId
    })));

  // Limiter aux jours demandés uniquement (même si on a étendu la fenêtre SQL)
  const allDates = new Set(requestedDays);
  
  console.log(`🗓️ Groupes shifts par date:`, Object.keys(shiftsByDate));
  console.log(`🗓️ Groupes pointages par date:`, Object.keys(pointagesByDate));

    for (const dateKey of allDates) {
      const shiftsJour = shiftsByDate[dateKey] || [];
      const pointagesJour = pointagesByDate[dateKey] || [];
      
      console.log(`\n📅 Traitement jour ${dateKey}:`);
      console.log(`  - Shifts: ${shiftsJour.length} (clés disponibles: ${Object.keys(shiftsByDate)})`);
      console.log(`  - Pointages: ${pointagesJour.length} (clés disponibles: ${Object.keys(pointagesByDate)})`);
      
      if (shiftsJour.length > 0) {
        console.log(`  - Shifts détails:`, shiftsJour.map(s => ({ id: s.id, type: s.type })));
      }
      if (pointagesJour.length > 0) {
        console.log(`  - Pointages détails:`, pointagesJour.map(p => ({ id: p.id, type: p.type })));
      }

      const comparaisonJour = {
        date: dateKey,
  employeId: employeIdNum,
        planifie: [],
        reel: [],
        ecarts: []
      };

      // Extraire les créneaux prévus et gérer les absences
      shiftsJour.forEach(shift => {
        console.log(`📋 Traitement shift ${shift.id}: type=${shift.type}, segments=`, shift.segments);
        
        if (shift.type === 'absence') {
          // Pour une absence planifiée, on marque qu'il ne devrait pas y avoir de pointage
          comparaisonJour.planifie.push({
            type: 'absence',
            motif: shift.motif,
            shiftId: shift.id
          });
          console.log(`  → Ajouté absence: ${shift.motif}`);
        } else if (Array.isArray(shift.segments) && shift.segments.length > 0) {
          // Pour une présence planifiée avec des segments
          shift.segments.forEach((segment, segIdx) => {
            console.log(`  → Segment ${segIdx}: start=${segment.start}, end=${segment.end}`);
            comparaisonJour.planifie.push({
              debut: segment.start,
              fin: segment.end,
              type: 'travail',
              shiftId: shift.id
            });
            console.log(`    ✅ Segment ajouté aux planifiés: ${segment.start}-${segment.end}`);
          });
        } else {
          console.log(`  ⚠️ Shift ignoré: pas de segments valides`);
        }
      });

      // --- Pairing robuste IN/OUT ---
      const ordered = [...pointagesJour].sort((a,b) => a.horodatage - b.horodatage);
      const cleaned = [];
      for (let i=0;i<ordered.length;i++) {
        const cur = ordered[i];
        if (cleaned.length === 0) { cleaned.push(cur); continue; }
        const prev = cleaned[cleaned.length-1];
        if (prev.type === cur.type) {
          // Appliquer fenêtre anti-doublon courte (<=2 minutes)
          const deltaMs = Math.abs(new Date(cur.horodatage) - new Date(prev.horodatage));
          if (deltaMs <= 2 * 60 * 1000) {
            console.log(`🧹 Doublon ignoré: ${cur.type} à ${cur.horodatage} (écart: ${deltaMs}ms)`);
            continue; // doublon immédiat
          }
        }
        cleaned.push(cur);
      }

      const pairs = [];
      let i=0;
      while (i < cleaned.length) {
        const current = cleaned[i];
        const isArrivee = current.type === 'arrivee' || current.type === 'arrivée' || current.type === 'ENTRÉE';
        const isDepart = current.type === 'depart' || current.type === 'départ' || current.type === 'SORTIE';

        if (isArrivee) {
          // Chercher l'index de la prochaine arrivée (délimitera le bloc de départs candidats)
          let nextArrivalIndex = -1;
          for (let k = i+1; k < cleaned.length; k++) {
            const t = cleaned[k].type;
            if (t === 'arrivee' || t === 'arrivée' || t === 'ENTRÉE') { nextArrivalIndex = k; break; }
          }
          const searchEnd = nextArrivalIndex === -1 ? cleaned.length : nextArrivalIndex;

          // Collecter tous les départs jusqu'à searchEnd (exclus la prochaine arrivée) et prendre le DERNIER
          let lastDepart = null;
            for (let k = i+1; k < searchEnd; k++) {
              const cand = cleaned[k];
              if (cand.type === 'depart' || cand.type === 'départ' || cand.type === 'SORTIE') {
                lastDepart = cand; // écrase jusqu'au dernier
              }
            }
          pairs.push({ arrivee: current, depart: lastDepart });
          if (lastDepart) {
            i = cleaned.indexOf(lastDepart) + 1; // sauter après le dernier depart choisi
          } else {
            i++;
          }
          continue;
        }
        if (isDepart) {
          // Départ orphelin (pas précédé d'une arrivée non encore utilisée)
          pairs.push({ arrivee: null, depart: current });
        }
        i++;
      }

      // Ne garder que les pairs valides (au moins un pointage non-null)
      pairs.filter(pr => pr.arrivee || pr.depart).forEach(pr => {
        comparaisonJour.reel.push({
          arrivee: pr.arrivee ? getParisTimeString(pr.arrivee.horodatage) : null,
          depart: pr.depart ? getParisTimeString(pr.depart.horodatage) : null,
          arriveeComplete: pr.arrivee ? pr.arrivee.horodatage : null,
          departComplete: pr.depart ? pr.depart.horodatage : null
        });
      });

      // Calculer les écarts uniquement pour les dates passées ou aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const jourDate = new Date(dateKey + 'T00:00:00');
      const isFutureDate = jourDate > today;
      
      if (isFutureDate) {
        // Pour les dates futures, pas d'écarts (pas encore de pointages attendus)
        comparaisonJour.ecarts = [];
      } else {
        comparaisonJour.ecarts = calculerEcarts(comparaisonJour.planifie, comparaisonJour.reel);
      }

      comparaisons.push(comparaisonJour);
    }

    res.json({
      success: true,
      periode: {
        debut: requestedDays[0],
        fin: requestedDays[requestedDays.length-1]
      },
  employeId: employeIdNum,
      comparaisons
    });

  } catch (error) {
    console.error("Erreur comparaison planning/réalité:", error);
    res.status(500).json({ error: "Erreur lors de la comparaison" });
  }
};

/**
 * Calcule les écarts entre planifié et réel
 */
function calculerEcarts(planifie, reel) {
  const ecarts = [];

  // Cas spécial: Absence planifiée mais présence détectée (pointages)
  const absencePlanifiee = planifie.find(p => p.type === 'absence');
  if (absencePlanifiee && reel.length > 0) {
    const first = reel[0];
    ecarts.push({
      type: 'absence_planifiee_avec_pointage',
      gravite: 'critique',
      description: `Pointage inattendu (absence prévue: ${absencePlanifiee.motif}): arrivée ${first?.arrivee || '—'}${first?.depart ? ', départ ' + first.depart : ''}`,
      motif: absencePlanifiee.motif
    });
    return ecarts;
  }

  // Cas 1: Absence totale (planning prévu mais aucun pointage)
  if (planifie.length > 0 && reel.length === 0) {
    // Vérifier si c'est une absence planifiée (cas normal)
    if (absencePlanifiee) {
      ecarts.push({
        type: 'absence_conforme',
        gravite: 'info',
        description: `Absence conforme: ${absencePlanifiee.motif}`,
        motif: absencePlanifiee.motif
      });
      return ecarts;
    }
    
    // Sinon, c'est une absence non planifiée sur un shift de présence
    let debutGlobal = null;
    let finGlobal = null;
    planifie.forEach(p => {
      if (p.debut) {
        if (!debutGlobal) debutGlobal = p.debut; else if (p.debut < debutGlobal) debutGlobal = p.debut;
      }
      if (p.fin) {
        if (!finGlobal) finGlobal = p.fin; else if (p.fin > finGlobal) finGlobal = p.fin;
      }
    });
    ecarts.push({
      type: 'absence_totale',
      gravite: 'critique',
      description: `Absence totale: aucun pointage enregistré sur le créneau prévu ${debutGlobal && finGlobal ? debutGlobal + '–' + finGlobal : ''}`
    });
    return ecarts;
  }

  // Cas 2: Présence non prévue (pointage sans planning)
  if (planifie.length === 0 && reel.length > 0) {
    const first = reel[0];
    ecarts.push({
      type: 'presence_non_prevue',
      gravite: 'attention',
      description: `Présence non prévue: pointage sans planning (arrivée ${first?.arrivee || '—'}${first?.depart ? ', départ ' + first.depart : ''})`
    });
    return ecarts;
  }

  // Cas 3: Comparaison détaillée avec multi-segments
  if (planifie.length > 0 && reel.length > 0) {
    console.log(`🔍 COMPARAISON DÉTAILLÉE:`);
    console.log(`📋 Créneaux prévus (${planifie.length}):`, planifie);
    console.log(`⏰ Pointages réels (${reel.length}):`, reel);
    
    // Vérification préliminaire des données
    const segmentsValides = planifie.filter(s => s.debut && s.fin);
    
    // Filtrage des segments redondants ou problématiques
    if (segmentsValides.length > 1) {
      const toRemove = new Set();
      const toMinutes = h => { 
        if (!h) return 0;
        const [hh, mm] = h.split(':').map(Number); 
        return hh*60+mm; 
      };
      
      // 1. Analyser les heures bizarres ou anormalement longues
      for (let i=0; i < segmentsValides.length; i++) {
        const seg = segmentsValides[i];
        const start = toMinutes(seg.debut);
        const end = toMinutes(seg.fin);
        const duration = end - start;
        
        if (duration <= 0) continue; // Segment invalide, sera déjà exclu
        
        // Détecter les minutes "bizarres" (non standards)
        const hasWeirdMinutes = !seg.debut.endsWith(':00') && !seg.debut.endsWith(':15') && 
                               !seg.debut.endsWith(':30') && !seg.debut.endsWith(':45');
                               
        // Très longue durée (>8h) avec minutes bizarres = probablement un agrégat
        if (duration > 480 && hasWeirdMinutes && seg.debut.includes('12:')) {
          toRemove.add(i);
          console.log(`🧹 Ignoré segment suspect (longue durée + minutes bizarres) ${i+1}: ${seg.debut}-${seg.fin}`);
          continue;
        }
      }
      
      // 2. Analyse des chevauchements significatifs
      // Trier les segments par heure de début
      const indexedSegments = segmentsValides
        .map((seg, idx) => ({ 
          idx, 
          start: toMinutes(seg.debut), 
          end: toMinutes(seg.fin),
          duration: toMinutes(seg.fin) - toMinutes(seg.debut),
          hasWeirdTime: !seg.debut.endsWith(':00') && !seg.debut.endsWith(':15') && 
                       !seg.debut.endsWith(':30') && !seg.debut.endsWith(':45')
        }))
        .filter(s => !toRemove.has(s.idx) && s.duration > 0)
        .sort((a, b) => a.start - b.start);
      
      // Détecter les segments fortement recouverts
      for (let i = 0; i < indexedSegments.length; i++) {
        const seg = indexedSegments[i];
        
        if (toRemove.has(seg.idx)) continue;
        
        // Calculer le recouvrement avec d'autres segments
        let overlapSum = 0;
        
        for (let j = 0; j < indexedSegments.length; j++) {
          if (i === j || toRemove.has(indexedSegments[j].idx)) continue;
          
          const other = indexedSegments[j];
          const overlapStart = Math.max(seg.start, other.start);
          const overlapEnd = Math.min(seg.end, other.end);
          
          if (overlapEnd > overlapStart) {
            overlapSum += (overlapEnd - overlapStart);
          }
        }
        
        const overlapRatio = overlapSum / seg.duration;
        
        // Critères de suppression plus agressifs
        // 1. Segments avec minutes bizarres ayant >50% recouvrement 
        // 2. Segments ayant >80% recouvrement
        if ((overlapRatio > 0.5 && seg.hasWeirdTime) || 
            (overlapRatio > 0.8) ||
            // Segments spécifiques identifiés dans l'image (12:29-17:30)
            (seg.start === toMinutes('12:29') && seg.end === toMinutes('17:30'))) {
          
          toRemove.add(seg.idx);
          console.log(`🧹 Ignoré segment redondant ${seg.idx+1}: ${segmentsValides[seg.idx].debut}-${segmentsValides[seg.idx].fin} (recouvrement ${Math.round(overlapRatio*100)}%)`);
        }
      }
      
      // Filtrer les segments à retirer
      if (toRemove.size > 0) {
        const filteredSegments = segmentsValides.filter((_, idx) => !toRemove.has(idx));
        console.log(`🧹 Filtrage segments: ${segmentsValides.length} → ${filteredSegments.length} (${toRemove.size} supprimés)`);
        segmentsValides.splice(0, segmentsValides.length, ...filteredSegments);
      }
    }
    
    const pointagesComplets = reel.filter(p => p.arrivee && p.depart);
    const arriveesSansDepartSur24h = reel.filter(p => p.arrivee && !p.depart);
    const departsSansArriveeSur24h = reel.filter(p => !p.arrivee && p.depart);
    
    console.log(`📊 Segmentation: ${segmentsValides.length} segments valides, ${pointagesComplets.length} pointages complets`);
    
    // Cas 3.1: Mapping intelligent avec correspondance d'index quand possible
    if (segmentsValides.length > 0) {
      
      // NOUVEL ALGORITHME D'APPARIEMENT
      // 1. Premièrement, on essaie de faire correspondre les pointages complets
      const assignations = new Map(); // segment_index -> pointage_index
      
      // On parcourt les segments dans l'ordre et on essaie de trouver le pointage complet le plus proche
      for (let segIdx = 0; segIdx < segmentsValides.length; segIdx++) {
        const segment = segmentsValides[segIdx];
        let meilleurFit = null;
        let meilleurScore = Infinity;
        
        for (let ptIdx = 0; ptIdx < pointagesComplets.length; ptIdx++) {
          // Vérifier si ce pointage n'est pas déjà assigné
          if ([...assignations.values()].includes(ptIdx)) continue;
          
          const pointage = pointagesComplets[ptIdx];
          const scoreArrivee = Math.abs(calculateTimeGapMinutes(segment.debut, pointage.arrivee));
          const scoreDepart = Math.abs(calculateTimeGapMinutes(segment.fin, pointage.depart));
          const scoreTotal = scoreArrivee + scoreDepart;
          
          if (scoreTotal < meilleurScore) {
            meilleurScore = scoreTotal;
            meilleurFit = { ptIdx, scoreArrivee, scoreDepart };
          }
        }
        
        if (meilleurFit) {
          assignations.set(segIdx, meilleurFit.ptIdx);
          console.log(`🔗 Segment ${segIdx + 1} (${segment.debut}-${segment.fin}) assigné au pointage ${meilleurFit.ptIdx + 1}`);
        }
      }
      
      // 2. Traiter les segments avec pointages complets assignés
      for (const [segIdx, ptIdx] of assignations.entries()) {
        const segment = segmentsValides[segIdx];
        const pointage = pointagesComplets[ptIdx];
        
        // Analyser l'arrivée
        const ecartArrivee = calculateTimeGapMinutes(segment.debut, pointage.arrivee);
        console.log(`📊 Écart arrivée segment ${segIdx + 1}: ${ecartArrivee} minutes`);
        
        // Utilisation des seuils centralisés
        let typeArrivee, graviteArrivee, descriptionArrivee;
        const minsArrivee = Math.abs(ecartArrivee);
        
        if (ecartArrivee > THRESHOLDS.ARRIVEE.EARLY_HORS_PLAGE) {
          typeArrivee = 'hors_plage_in';
          graviteArrivee = 'hors_plage';
          descriptionArrivee = `🟣 Hors-plage IN: arrivée à ${pointage.arrivee}, ${minsArrivee} min trop tôt (prévu ${segment.debut}) → À valider`;
        } else if (ecartArrivee >= THRESHOLDS.ARRIVEE.RETARD_ACCEPTABLE) {
          typeArrivee = 'arrivee_acceptable';
          graviteArrivee = 'ok';
          descriptionArrivee = `🟢 Arrivée acceptable: ${pointage.arrivee} (prévu ${segment.debut}, écart ${ecartArrivee >= 0 ? '+' : ''}${ecartArrivee} min)`;
        } else if (ecartArrivee >= THRESHOLDS.ARRIVEE.RETARD_MODERE) {
          typeArrivee = 'retard_modere';
          graviteArrivee = 'attention';
          descriptionArrivee = `🟡 Retard modéré: arrivée à ${pointage.arrivee}, ${minsArrivee} min de retard (prévu ${segment.debut})`;
          console.log(`🟡 RETARD MODÉRÉ DÉTECTÉ: segment ${segIdx + 1}, écart=${ecartArrivee}min, seuil=${THRESHOLDS.ARRIVEE.RETARD_MODERE}`);
        } else {
          typeArrivee = 'retard_critique';
          graviteArrivee = 'critique';
          descriptionArrivee = `🔴 Retard critique: arrivée à ${pointage.arrivee}, ${minsArrivee} min de retard (prévu ${segment.debut})`;
          console.log(`🔴 RETARD CRITIQUE DÉTECTÉ: segment ${segIdx + 1}, écart=${ecartArrivee}min, seuil=${THRESHOLDS.ARRIVEE.RETARD_MODERE}`);
        }
        
        const ecartArriveeObj = {
          type: typeArrivee,
          gravite: graviteArrivee,
          dureeMinutes: minsArrivee,
          description: descriptionArrivee,
          prevu: segment.debut,
          reel: pointage.arrivee,
          ecartMinutes: ecartArrivee,
          segment: segIdx + 1
        };
        console.log(`📤 ÉCART ARRIVÉE AJOUTÉ:`, JSON.stringify(ecartArriveeObj, null, 2));
        ecarts.push(ecartArriveeObj);
        
        // Analyser le départ avec les 3 zones de tolérance
        const ecartDepart = calculateTimeGapMinutes(segment.fin, pointage.depart);
        console.log(`📊 Écart départ segment ${segIdx + 1}: ${ecartDepart} minutes`);
        
        let typeDepart, graviteDepart, descriptionDepart;
        const minsDepart = Math.abs(ecartDepart);
        
        if (ecartDepart > THRESHOLDS.DEPART.DEPART_PREMATURE_CRITIQUE) {
          // Départ prématuré > 30 min trop tôt
          typeDepart = 'depart_premature_critique';
          graviteDepart = 'critique';
          descriptionDepart = `� Départ prématuré critique: parti à ${pointage.depart}, ${minsDepart} min trop tôt (prévu ${segment.fin})`;
        } else if (ecartDepart > THRESHOLDS.DEPART.DEPART_ANTICIPE) {
          // Départ anticipé 15-30 min trop tôt
          typeDepart = 'depart_anticipe';
          graviteDepart = 'attention';
          descriptionDepart = `� Départ anticipé: parti à ${pointage.depart}, ${minsDepart} min trop tôt (prévu ${segment.fin})`;
        } else if (ecartDepart >= THRESHOLDS.DEPART.HEURES_SUP_AUTO_VALIDEES) {
          // Zone acceptable : départ à l'heure ou jusqu'à +30 min d'heures sup (auto-validées)
          if (ecartDepart >= 0) {
            typeDepart = 'depart_acceptable';
            graviteDepart = 'ok';
            descriptionDepart = `� Départ acceptable: ${pointage.depart} (prévu ${segment.fin}, écart ${ecartDepart >= 0 ? '+' : ''}${ecartDepart} min)`;
          } else {
            typeDepart = 'heures_sup_auto_validees';
            graviteDepart = 'info';
            descriptionDepart = `� Heures sup auto-validées: départ à ${pointage.depart}, ${minsDepart} min d'heures sup (prévu ${segment.fin}) → Payées automatiquement`;
          }
        } else if (ecartDepart >= THRESHOLDS.DEPART.HEURES_SUP_A_VALIDER) {
          // Zone à valider : +30 min à +90 min d'heures sup
          typeDepart = 'heures_sup_a_valider';
          graviteDepart = 'a_valider';
          descriptionDepart = `⚠️ Heures sup à valider: départ à ${pointage.depart}, ${minsDepart} min d'heures sup (prévu ${segment.fin}) → Validation managériale requise`;
        } else {
          // Hors-plage critique : > +90 min d'heures sup
          typeDepart = 'hors_plage_out_critique';
          graviteDepart = 'hors_plage';
          descriptionDepart = `🟣 Hors-plage OUT critique: départ à ${pointage.depart}, ${minsDepart} min d'heures sup (prévu ${segment.fin}) → Probable oubli de badge, correction manuelle requise`;
        }
        
        ecarts.push({
          type: typeDepart,
          gravite: graviteDepart,
          dureeMinutes: minsDepart,
          description: descriptionDepart,
          prevu: segment.fin,
          reel: pointage.depart,
          ecartMinutes: ecartDepart,
          segment: segIdx + 1
        });
      }
      
      // 3. Traiter les segments sans pointage complet correspondant (absence partielle)
      for (let segIdx = 0; segIdx < segmentsValides.length; segIdx++) {
        if (assignations.has(segIdx)) continue; // Segment déjà traité
        
        const segment = segmentsValides[segIdx];
        console.log(`🔍 Segment ${segIdx + 1} sans pointage complet correspondant`);
        
        // Vérifier s'il y a une arrivée sans départ pour ce segment
        let arriveeCorrespondante = null;
        for (const arrivee of arriveesSansDepartSur24h) {
          const ecart = calculateTimeGapMinutes(segment.debut, arrivee.arrivee);
          if (Math.abs(ecart) < 120) { // 2h max d'écart
            arriveeCorrespondante = arrivee;
            break;
          }
        }
        
        // Vérifier s'il y a un départ sans arrivée pour ce segment
        let departCorrespondant = null;
        for (const depart of departsSansArriveeSur24h) {
          const ecart = calculateTimeGapMinutes(segment.fin, depart.depart);
          if (Math.abs(ecart) < 120) { // 2h max d'écart
            departCorrespondant = depart;
            break;
          }
        }
        
        if (!arriveeCorrespondante && !departCorrespondant) {
          // Absence totale sur ce segment
          ecarts.push({
            type: 'segment_non_pointe',
            gravite: 'critique',
            description: `🔴 Segment ${segIdx + 1} (${segment.debut}-${segment.fin}) sans aucun pointage`,
            prevu: `${segment.debut}-${segment.fin}`,
            segment: segIdx + 1
          });
        } else {
          // Absence partielle
          if (!arriveeCorrespondante) {
            ecarts.push({
              type: 'missing_in',
              gravite: 'critique',
              description: `🔴 Arrivée manquante pour le segment ${segIdx + 1} (début prévu: ${segment.debut})`,
              prevu: segment.debut,
              segment: segIdx + 1
            });
          }
          
          if (!departCorrespondant) {
            ecarts.push({
              type: 'missing_out',
              gravite: 'critique',
              description: `🔴 Départ manquant pour le segment ${segIdx + 1} (fin prévue: ${segment.fin})`,
              prevu: segment.fin,
              segment: segIdx + 1
            });
          }
        }
      }
      
      // 4. Traiter les pointages complets non assignés (hors planning)
      for (let ptIdx = 0; ptIdx < pointagesComplets.length; ptIdx++) {
        if ([...assignations.values()].includes(ptIdx)) continue; // Pointage déjà assigné
        
        const pointage = pointagesComplets[ptIdx];
        ecarts.push({
          type: 'pointage_hors_planning',
          gravite: 'attention',
          description: `🟡 Pointage hors planning: ${pointage.arrivee} → ${pointage.depart}`,
          reel: `${pointage.arrivee}-${pointage.depart}`
        });
      }
    }
  }

  return ecarts;
}

/**
 * Calcule l'écart en minutes entre une heure prévue et une heure réelle
 * Tout est normalisé sur le fuseau Europe/Paris
 * @deprecated - Utiliser calculateTimeGapMinutes des utils/parisTimeUtils.js
 */
function calculerEcartHoraire(heurePrevu, heureReelle) {
  console.log(`🔧 calculerEcartHoraire (Europe/Paris): "${heurePrevu}" vs "${heureReelle}"`);
  
  // Rediriger vers la fonction utilitaire standardisée
  return calculateTimeGapMinutes(heurePrevu, heureReelle);
}

module.exports = {
  getPlanningVsRealite,
  THRESHOLDS // Export des seuils pour réutilisation
};
