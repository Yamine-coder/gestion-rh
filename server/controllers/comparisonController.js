const prisma = require("../prisma/client");
const { getParisTimeString, calculateTimeGapMinutes } = require("../utils/parisTimeUtils");
const { toLocalDateString, getCurrentDateString } = require("../utils/dateUtils");
const { parseSegments } = require('../utils/segmentUtils');
const {
  getBusinessDay,
  getBusinessRangeBoundsUTC,
  horodatageToParisDate,
} = require('../utils/businessDayUtils');

// Centralisation des seuils d'alerte
const THRESHOLDS = {
  ARRIVEE: {
    EARLY_AUTO_VALIDEES: 30,   // jusqu'à 30 min trop tôt => auto-validées
    EARLY_EXTRA_POTENTIEL: 90, // 30-90 min trop tôt => extra potentiel
    EARLY_HORS_PLAGE: 91,      // > 90 min trop tôt => hors plage IN critique
    RETARD_ACCEPTABLE: -5,     // jusqu'à -5 min (retard) acceptable
    RETARD_MODERE: -20         // jusqu'à -20 min retard modéré, au delà critique
  },
  DEPART: {
    DEPART_PREMATURE_CRITIQUE: 30,  // > 30 min trop tôt
    DEPART_ANTICIPE: 15,            // 15-30 min trop tôt
    HEURES_SUP_AUTO_VALIDEES: -30,  // jusqu'à 30 min en plus => auto-validées
    EXTRA_POTENTIEL: -90,           // 30-90 min en plus => extra potentiel
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
      requestedDays = [getCurrentDateString()];
    }

    const minDay = requestedDays[0];
    const maxDay = requestedDays[requestedDays.length - 1];

    // Fenêtre UTC basée sur les jours business (cutoff 05:00 Paris)
    const { start: queryStart, end: queryEnd } = getBusinessRangeBoundsUTC(minDay, maxDay);
    // Marge pour attraper shifts J-1 et pointages post-minuit
    queryStart.setUTCDate(queryStart.getUTCDate() - 1);
    queryEnd.setUTCDate(queryEnd.getUTCDate() + 1);

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

    // 3. Organiser les données par jour et calculer les écarts
    const comparaisons = [];

    // Grouper les shifts par date calendaire Paris
    // (un shift créé pour le "10 février" reste sur le 10 février)
    const shiftsByDate = {};
    shiftsPrevus.forEach(shift => {
      const shiftDateParis = horodatageToParisDate(shift.date);
      if (!shiftsByDate[shiftDateParis]) shiftsByDate[shiftDateParis] = [];
      shiftsByDate[shiftDateParis].push(shift);
    });

    // Grouper les pointages par JOUR BUSINESS (cutoff 05:00 Paris)
    // Un départ à 00:30 le 11/02 → jour business du 10/02 (automatique)
    // Plus besoin de shiftNightMapping, de rattachement J-1, ni de garde anti-coupure
    const pointagesByDate = {};
    pointagesReels.forEach(p => {
      const businessDay = getBusinessDay(p.horodatage);
      if (!pointagesByDate[businessDay]) pointagesByDate[businessDay] = [];
      pointagesByDate[businessDay].push(p);
    });

    for (const dateKey of requestedDays) {
      const shiftsJour = shiftsByDate[dateKey] || [];
      const pointagesJour = (pointagesByDate[dateKey] || [])
        .sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage));
      
      const comparaisonJour = {
        date: dateKey,
  employeId: employeIdNum,
        planifie: [],
        reel: [],
        ecarts: []
      };

      // Extraire les créneaux prévus et gérer les absences
      shiftsJour.forEach(shift => {
        
        if (shift.type === 'absence') {
          // Pour une absence planifiée, on marque qu'il ne devrait pas y avoir de pointage
          comparaisonJour.planifie.push({
            type: 'absence',
            motif: shift.motif,
            shiftId: shift.id
          });
        } else {
          // Pour une présence planifiée avec des segments
          const segments = parseSegments(shift.segments);
          if (segments.length > 0) {
            // 🆕 Détecter les segments Extra payés qui précèdent
            let lastExtraEnd = null;
            
            segments.forEach((segment, segIdx) => {
              // 🆕 Ignorer les segments Extra (déjà traités/payés séparément)
              if (segment.isExtra) {
                // 🆕 Mémoriser la fin du segment Extra pour le segment suivant
                if (segment.paymentStatus === 'paye' || segment.paymentStatus === 'payé') {
                  lastExtraEnd = segment.end;
                }
                return;
              }
              
              // 🆕 Vérifier si un segment Extra payé précède immédiatement
              const hasExtraBefore = lastExtraEnd && lastExtraEnd === segment.start;
              
              comparaisonJour.planifie.push({
                debut: segment.start,
                fin: segment.end,
                type: 'travail',
                shiftId: shift.id,
                originalIndex: segIdx + 1, // 🆕 Index original (1-based) incluant les Extra
                hasExtraBefore: hasExtraBefore // 🆕 Indique si un Extra payé précède ce segment
              });
              
              // Réinitialiser après utilisation
              lastExtraEnd = null;
            });
          } else {
          }
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
            continue; // doublon immédiat
          }
        }
        cleaned.push(cur);
      }

      const pairs = [];
      let i=0;
      while (i < cleaned.length) {
        const current = cleaned[i];
        const isArrivee = current.type === 'arrivee' || current.type === 'arrivée' || current.type === 'ENTRÉE' || current.type === 'entree';
        const isDepart = current.type === 'depart' || current.type === 'départ' || current.type === 'SORTIE' || current.type === 'sortie';

        if (isArrivee) {
          // Chercher l'index de la prochaine arrivée (délimitera le bloc de départs candidats)
          let nextArrivalIndex = -1;
          for (let k = i+1; k < cleaned.length; k++) {
            const t = cleaned[k].type;
            if (t === 'arrivee' || t === 'arrivée' || t === 'ENTRÉE' || t === 'entree') { nextArrivalIndex = k; break; }
          }
          const searchEnd = nextArrivalIndex === -1 ? cleaned.length : nextArrivalIndex;

          // Collecter tous les départs jusqu'à searchEnd (exclus la prochaine arrivée) et prendre le DERNIER
          let lastDepart = null;
            for (let k = i+1; k < searchEnd; k++) {
              const cand = cleaned[k];
              if (cand.type === 'depart' || cand.type === 'départ' || cand.type === 'SORTIE' || cand.type === 'sortie') {
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
    
    // Vérification préliminaire des données
    const segmentsValides = planifie.filter(s => s.debut && s.fin && !s.isExtra);
    
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
        }
      }
      
      // Filtrer les segments à retirer
      if (toRemove.size > 0) {
        const filteredSegments = segmentsValides.filter((_, idx) => !toRemove.has(idx));
        segmentsValides.splice(0, segmentsValides.length, ...filteredSegments);
      }
    }
    
    const pointagesComplets = reel.filter(p => p.arrivee && p.depart);
    const arriveesSansDepartSur24h = reel.filter(p => p.arrivee && !p.depart);
    const departsSansArriveeSur24h = reel.filter(p => !p.arrivee && p.depart);
    
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
        }
      }
      
      // 2. Traiter les segments avec pointages complets assignés
      for (const [segIdx, ptIdx] of assignations.entries()) {
        const segment = segmentsValides[segIdx];
        const pointage = pointagesComplets[ptIdx];
        
        // 🆕 Si un segment Extra payé précède, l'arrivée est considérée conforme
        // car l'employé était déjà présent avant le début du segment
        let effectiveArrivee = pointage.arrivee;
        if (segment.hasExtraBefore) {
          effectiveArrivee = segment.debut; // L'employé était là à l'heure
        }
        
        // Analyser l'arrivée
        const ecartArrivee = calculateTimeGapMinutes(segment.debut, effectiveArrivee);
        
        // Utilisation des seuils centralisés - 3 zones pour arrivée anticipée
        let typeArrivee, graviteArrivee, descriptionArrivee;
        const minsArrivee = Math.abs(ecartArrivee);
        
        if (ecartArrivee >= THRESHOLDS.ARRIVEE.EARLY_HORS_PLAGE) {
          // > 90 min trop tôt => hors-plage critique
          typeArrivee = 'hors_plage_in_critique';
          graviteArrivee = 'hors_plage';
          descriptionArrivee = `Hors-plage IN critique: arrivée à ${pointage.arrivee}, ${minsArrivee} min trop tôt (prévu ${segment.debut}) → Probable oubli de badge, correction requise`;
        } else if (ecartArrivee >= THRESHOLDS.ARRIVEE.EARLY_AUTO_VALIDEES) {
          // 30-90 min trop tôt => Extra potentiel (arrivée anticipée)
          typeArrivee = 'arrivee_anticipee_extra';
          graviteArrivee = 'a_valider';
          descriptionArrivee = `Extra potentiel (arrivée): arrivé à ${pointage.arrivee}, ${minsArrivee} min en avance (prévu ${segment.debut}) → Validation managériale requise`;
        } else if (ecartArrivee > 0) {
          // 0-30 min trop tôt => auto-validé
          typeArrivee = 'arrivee_anticipee_auto';
          graviteArrivee = 'info';
          descriptionArrivee = `Arrivée anticipée auto-validée: ${pointage.arrivee}, ${minsArrivee} min en avance (prévu ${segment.debut}) → Payées automatiquement`;
        } else if (ecartArrivee >= THRESHOLDS.ARRIVEE.RETARD_ACCEPTABLE) {
          typeArrivee = 'arrivee_acceptable';
          graviteArrivee = 'ok';
          descriptionArrivee = `Arrivée acceptable: ${pointage.arrivee} (prévu ${segment.debut}, écart ${ecartArrivee >= 0 ? '+' : ''}${ecartArrivee} min)`;
        } else if (ecartArrivee >= THRESHOLDS.ARRIVEE.RETARD_MODERE) {
          typeArrivee = 'retard_modere';
          graviteArrivee = 'attention';
          descriptionArrivee = `Retard modéré: arrivée à ${pointage.arrivee}, ${minsArrivee} min de retard (prévu ${segment.debut})`;
        } else {
          typeArrivee = 'retard_critique';
          graviteArrivee = 'critique';
          descriptionArrivee = `Retard critique: arrivée à ${pointage.arrivee}, ${minsArrivee} min de retard (prévu ${segment.debut})`;
        }
        
        const ecartArriveeObj = {
          type: typeArrivee,
          gravite: graviteArrivee,
          dureeMinutes: minsArrivee,
          description: descriptionArrivee,
          prevu: segment.debut,
          reel: pointage.arrivee,
          heureArriveeReelle: pointage.arrivee,
          heureDepartReelle: pointage.depart,
          ecartMinutes: ecartArrivee,
          segment: segment.originalIndex || (segIdx + 1) // 🆕 Utiliser l'index original si disponible
        };
        ecarts.push(ecartArriveeObj);
        
        // Analyser le départ avec les 3 zones de tolérance
        const ecartDepart = calculateTimeGapMinutes(segment.fin, pointage.depart);
        
        let typeDepart, graviteDepart, descriptionDepart;
        const minsDepart = Math.abs(ecartDepart);
        
        if (ecartDepart > THRESHOLDS.DEPART.DEPART_PREMATURE_CRITIQUE) {
          // Départ prématuré > 30 min trop tôt
          typeDepart = 'depart_premature_critique';
          graviteDepart = 'critique';
          descriptionDepart = `Départ prématuré critique: parti à ${pointage.depart}, ${minsDepart} min trop tôt (prévu ${segment.fin})`;
        } else if (ecartDepart > THRESHOLDS.DEPART.DEPART_ANTICIPE) {
          // Départ anticipé 15-30 min trop tôt
          typeDepart = 'depart_anticipe';
          graviteDepart = 'attention';
          descriptionDepart = `Départ anticipé: parti à ${pointage.depart}, ${minsDepart} min trop tôt (prévu ${segment.fin})`;
        } else if (ecartDepart >= THRESHOLDS.DEPART.HEURES_SUP_AUTO_VALIDEES) {
          // Zone acceptable : départ à l'heure ou jusqu'à +30 min d'heures sup (auto-validées)
          if (ecartDepart >= 0) {
            typeDepart = 'depart_acceptable';
            graviteDepart = 'ok';
            descriptionDepart = `Départ acceptable: ${pointage.depart} (prévu ${segment.fin}, écart ${ecartDepart >= 0 ? '+' : ''}${ecartDepart} min)`;
          } else {
            typeDepart = 'heures_sup_auto_validees';
            graviteDepart = 'info';
            descriptionDepart = `Heures sup auto-validées: départ à ${pointage.depart}, ${minsDepart} min d'heures sup (prévu ${segment.fin}) → Payées automatiquement`;
          }
        } else if (ecartDepart >= THRESHOLDS.DEPART.EXTRA_POTENTIEL) {
          // Zone à valider : +30 min à +90 min d'heures sup
          typeDepart = 'extra_potentiel';
          graviteDepart = 'a_valider';
          descriptionDepart = `Extra potentiel: départ à ${pointage.depart}, ${minsDepart} min en plus (prévu ${segment.fin}) → Validation managériale requise`;
        } else {
          // Hors-plage critique : > +90 min d'heures sup
          typeDepart = 'hors_plage_out_critique';
          graviteDepart = 'hors_plage';
          descriptionDepart = `Hors-plage OUT critique: départ à ${pointage.depart}, ${minsDepart} min d'heures sup (prévu ${segment.fin}) → Probable oubli de badge, correction manuelle requise`;
        }
        
        ecarts.push({
          type: typeDepart,
          gravite: graviteDepart,
          dureeMinutes: minsDepart,
          description: descriptionDepart,
          prevu: segment.fin,
          reel: pointage.depart,
          heureArriveeReelle: pointage.arrivee,
          heureDepartReelle: pointage.depart,
          ecartMinutes: ecartDepart,
          segment: segment.originalIndex || (segIdx + 1) // 🆕 Utiliser l'index original si disponible
        });
      }
      
      // 3. Traiter les segments sans pointage complet correspondant (absence partielle)
      for (let segIdx = 0; segIdx < segmentsValides.length; segIdx++) {
        if (assignations.has(segIdx)) continue; // Segment déjà traité
        
        const segment = segmentsValides[segIdx];
        
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
            description: `🔴 Segment ${segment.originalIndex || (segIdx + 1)} (${segment.debut}-${segment.fin}) sans aucun pointage`,
            prevu: `${segment.debut}-${segment.fin}`,
            segment: segment.originalIndex || (segIdx + 1)
          });
        } else {
          // Absence partielle
          if (!arriveeCorrespondante) {
            ecarts.push({
              type: 'missing_in',
              gravite: 'critique',
              description: `🔴 Arrivée manquante pour le segment ${segment.originalIndex || (segIdx + 1)} (début prévu: ${segment.debut})`,
              prevu: segment.debut,
              segment: segment.originalIndex || (segIdx + 1)
            });
          }
          
          if (!departCorrespondant) {
            ecarts.push({
              type: 'missing_out',
              gravite: 'critique',
              description: `🔴 Départ manquant pour le segment ${segment.originalIndex || (segIdx + 1)} (fin prévue: ${segment.fin})`,
              prevu: segment.fin,
              segment: segment.originalIndex || (segIdx + 1)
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

module.exports = {
  getPlanningVsRealite,
  THRESHOLDS // Export des seuils pour réutilisation
};
