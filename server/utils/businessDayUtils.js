/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LOGIQUE MÉTIER RESTAURANT — Jour business & Appariement Segment/Pointage
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * RÈGLES FONDAMENTALES :
 * 1. Le jour business va de 05:00 à 04:59 le lendemain
 *    → Un départ à 00:30 le 11/02 appartient au jour business du 10/02
 *    → Une arrivée à 07:00 le 11/02 appartient au jour business du 11/02
 * 
 * 2. L'appariement se fait PAR SEGMENT, pas par date calendaire
 *    → Pour chaque segment planifié, on cherche le meilleur IN/OUT
 *      dans une fenêtre temporelle autour du segment
 *    → Plus de hacks de "rattachement à J-1"
 * 
 * 3. Tout pointage qui n'entre dans aucune fenêtre de segment = "hors planning"
 * 
 * CONTEXTE RESTAURANT CHEZ ANTOINE :
 *   - Équipe matin : 7h → 15h
 *   - Coupure type : 11h-14:30 + 18:30-23h
 *   - Soir tardif : 19h → 00:30/01:00
 *   - Plage morte : 01:30 → 06:30
 * 
 * CUTOFF UNIVERSEL : 05:00 (configuré ci-dessous)
 */

const { parseSegments } = require('./segmentUtils');
const { isEntree, isSortie } = require('./pointageTypeUtils');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION CENTRALE
// ═══════════════════════════════════════════════════════════════════════════

/** Heure de cutoff du jour business (05:00) — UNIQUE SOURCE DE VÉRITÉ */
const BUSINESS_DAY_CUTOFF_HOUR = 5;

/** Fenêtres de tolérance pour l'appariement segment/pointage (en minutes) */
const MATCHING_WINDOWS = {
  ARRIVEE_AVANT: 90,   // On accepte une arrivée jusqu'à 90 min AVANT le début du segment
  ARRIVEE_APRES: 60,   // On accepte une arrivée jusqu'à 60 min APRÈS le début du segment
  DEPART_AVANT: 30,    // On accepte un départ jusqu'à 30 min AVANT la fin du segment
  DEPART_APRES: 180,   // On accepte un départ jusqu'à 180 min APRÈS la fin (fermeture, ménage...)
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS INTERNES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convertit "HH:MM" en minutes depuis minuit (0-1439)
 */
function hhmmToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Convertit des minutes en "HH:MM" (gère > 24h = modulo 1440)
 */
function minutesToHHMM(minutes) {
  if (minutes == null || isNaN(minutes)) return '--:--';
  const m = ((minutes % 1440) + 1440) % 1440; // toujours positif
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
}

/**
 * Extrait l'heure Paris d'un horodatage en minutes depuis minuit
 * @param {Date|string} horodatage
 * @returns {number} minutes depuis minuit (0-1439)
 */
function horodatageToParisMinutes(horodatage) {
  const d = horodatage instanceof Date ? horodatage : new Date(horodatage);
  const parisStr = d.toLocaleTimeString('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const [h, m] = parisStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Extrait l'heure Paris en format "HH:MM" d'un horodatage
 * @param {Date|string} horodatage
 * @returns {string} "HH:MM"
 */
function horodatageToParisHHMM(horodatage) {
  return minutesToHHMM(horodatageToParisMinutes(horodatage));
}

/**
 * Extrait la date Paris "YYYY-MM-DD" d'un horodatage
 */
function horodatageToParisDate(horodatage) {
  const d = horodatage instanceof Date ? horodatage : new Date(horodatage);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year').value;
  const mo = parts.find(p => p.type === 'month').value;
  const da = parts.find(p => p.type === 'day').value;
  return `${y}-${mo}-${da}`;
}

/**
 * Détermine le jour business d'un horodatage
 * Avant 05:00 → jour précédent
 * @param {Date|string} horodatage
 * @returns {string} "YYYY-MM-DD"
 */
function getBusinessDay(horodatage) {
  const d = horodatage instanceof Date ? horodatage : new Date(horodatage);
  const parisMinutes = horodatageToParisMinutes(d);
  
  if (parisMinutes < BUSINESS_DAY_CUTOFF_HOUR * 60) {
    // Avant le cutoff → jour business = veille
    const veille = new Date(d.getTime() - 24 * 60 * 60 * 1000);
    return horodatageToParisDate(veille);
  }
  return horodatageToParisDate(d);
}

/**
 * Retourne les bornes UTC d'un jour business (pour les requêtes Prisma)
 * Jour business du "2026-02-10" = 10/02 05:00 Paris → 11/02 04:59:59.999 Paris
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {{ start: Date, end: Date }}
 */
function getBusinessDayBoundsUTC(dateStr) {
  // Déterminer l'offset Paris pour cette date
  const midday = new Date(`${dateStr}T12:00:00Z`);
  const parisStr = midday.toLocaleString('en-US', { timeZone: 'Europe/Paris', hour12: false });
  const parisHour = new Date(parisStr).getHours();
  const utcHour = midday.getUTCHours();
  const offsetHours = parisHour - utcHour;
  
  // Début : dateStr 05:00 Paris → 05:00 - offset UTC
  const start = new Date(`${dateStr}T${String(BUSINESS_DAY_CUTOFF_HOUR).padStart(2, '0')}:00:00.000Z`);
  start.setUTCHours(start.getUTCHours() - offsetHours);
  
  // Fin : dateStr+1 04:59:59.999 Paris → 04:59:59.999 - offset UTC
  const nextDay = new Date(`${dateStr}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  
  const end = new Date(`${nextDayStr}T${String(BUSINESS_DAY_CUTOFF_HOUR).padStart(2, '0')}:00:00.000Z`);
  end.setUTCHours(end.getUTCHours() - offsetHours);
  end.setUTCMilliseconds(-1); // 04:59:59.999
  
  return { start, end };
}

/**
 * Retourne la fenêtre de requête UTC étendue pour couvrir un range de jours business
 * (inclus les marges pour les pointages post-minuit)
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} endDate - "YYYY-MM-DD"
 * @returns {{ start: Date, end: Date }}
 */
function getBusinessRangeBoundsUTC(startDate, endDate) {
  const startBounds = getBusinessDayBoundsUTC(startDate);
  const endBounds = getBusinessDayBoundsUTC(endDate);
  return { start: startBounds.start, end: endBounds.end };
}

// ═══════════════════════════════════════════════════════════════════════════
// APPARIEMENT SEGMENT / POINTAGE (COEUR DU SYSTÈME)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcule les minutes "linéarisées" pour un segment qui peut traverser minuit.
 * Ex: segment 22:00-01:00 → { debutMin: 1320, finMin: 1500 } (pas 60)
 * @param {string} debut - "HH:MM"
 * @param {string} fin - "HH:MM"
 * @returns {{ debutMin: number, finMin: number, dureeMin: number }}
 */
function lineariserSegment(debut, fin) {
  const debutMin = hhmmToMinutes(debut);
  let finMin = hhmmToMinutes(fin);
  if (finMin == null || debutMin == null) return { debutMin: 0, finMin: 0, dureeMin: 0 };
  
  // Si fin < début, le segment traverse minuit
  if (finMin <= debutMin) {
    finMin += 1440; // ajouter 24h
  }
  return { debutMin, finMin, dureeMin: finMin - debutMin };
}

/**
 * Linéarise la minute d'un pointage par rapport à un segment (gère passage minuit)
 * Si le pointage est avant 05:00 et le segment commence après 12:00 → ajouter 24h
 * @param {number} pointageMinutes - Minutes Paris du pointage (0-1439)
 * @param {number} segmentDebutMin - Minutes du début du segment
 * @returns {number} Minutes linéarisées
 */
function lineariserPointage(pointageMinutes, segmentDebutMin) {
  // Si le pointage est tôt le matin (< 5h = 300 min) et le segment est tard (> 12h = 720 min)
  // → c'est un pointage post-minuit pour un shift de la veille
  if (pointageMinutes < BUSINESS_DAY_CUTOFF_HOUR * 60 && segmentDebutMin >= 720) {
    return pointageMinutes + 1440;
  }
  return pointageMinutes;
}

/**
 * FONCTION PRINCIPALE : Apparie les pointages aux segments planifiés.
 * 
 * Algorithme :
 * 1. Pour chaque segment, calcule la fenêtre de recherche d'arrivée et de départ
 * 2. Cherche le meilleur IN dans la fenêtre arrivée (le plus proche du début)
 * 3. Cherche le meilleur OUT dans la fenêtre départ (le plus proche de la fin)
 * 4. Les pointages non utilisés sont retournés comme "hors planning"
 * 
 * @param {Array} segments - Segments planifiés [{start:"HH:MM", end:"HH:MM"}, ...]
 * @param {Array} pointages - Pointages triés par horodatage [{id, type, horodatage}, ...]
 * @returns {{
 *   appariements: Array<{segment, arrivee, depart, dureeReelleMin, dureePrevueMin, ecartMin}>,
 *   horsPlanning: Array<{pointage, parisTime}>,
 *   segmentsSansPointage: Array<{segment, index}>
 * }}
 */
function apparierPointagesParSegment(segments, pointages) {
  if (!segments || segments.length === 0) {
    // Pas de planning → tout est hors planning
    return {
      appariements: [],
      horsPlanning: pointages.map(p => ({
        pointage: p,
        parisTime: horodatageToParisHHMM(p.horodatage),
        parisMinutes: horodatageToParisMinutes(p.horodatage)
      })),
      segmentsSansPointage: []
    };
  }

  const usedPointageIds = new Set();
  const appariements = [];

  // Préparer les pointages avec leurs minutes Paris
  const pointagesEnrichis = pointages.map(p => ({
    ...p,
    parisMinutes: horodatageToParisMinutes(p.horodatage),
    parisTime: horodatageToParisHHMM(p.horodatage),
    estEntree: isEntree(p.type),
    estSortie: isSortie(p.type)
  }));

  // Filtrer les arrivées et départs
  const arrivees = pointagesEnrichis.filter(p => p.estEntree);
  const departs = pointagesEnrichis.filter(p => p.estSortie);

  // Pour chaque segment planifié, chercher le meilleur match
  segments.forEach((segment, idx) => {
    const debut = segment.start || segment.debut;
    const fin = segment.end || segment.fin;
    if (!debut || !fin) return;
    
    const { debutMin, finMin, dureeMin } = lineariserSegment(debut, fin);
    
    // Définir les fenêtres de recherche
    const fenetreArriveeMin = debutMin - MATCHING_WINDOWS.ARRIVEE_AVANT;
    const fenetreArriveeMax = debutMin + MATCHING_WINDOWS.ARRIVEE_APRES;
    const fentreDepartMin = finMin - MATCHING_WINDOWS.DEPART_AVANT;
    const fentreDepartMax = finMin + MATCHING_WINDOWS.DEPART_APRES;

    // Chercher la meilleure arrivée (la plus proche du début planifié)
    let meilleureArrivee = null;
    let meilleurScoreArrivee = Infinity;

    for (const arr of arrivees) {
      if (usedPointageIds.has(arr.id)) continue;
      const linearMin = lineariserPointage(arr.parisMinutes, debutMin);
      
      if (linearMin >= fenetreArriveeMin && linearMin <= fenetreArriveeMax) {
        const score = Math.abs(linearMin - debutMin);
        if (score < meilleurScoreArrivee) {
          meilleurScoreArrivee = score;
          meilleureArrivee = { ...arr, linearMin };
        }
      }
    }

    // Chercher le meilleur départ (le plus proche de la fin planifiée)
    let meilleurDepart = null;
    let meilleurScoreDepart = Infinity;

    for (const dep of departs) {
      if (usedPointageIds.has(dep.id)) continue;
      const linearMin = lineariserPointage(dep.parisMinutes, debutMin);
      
      if (linearMin >= fentreDepartMin && linearMin <= fentreDepartMax) {
        const score = Math.abs(linearMin - finMin);
        if (score < meilleurScoreDepart) {
          meilleurScoreDepart = score;
          meilleurDepart = { ...dep, linearMin };
        }
      }
    }

    // Marquer comme utilisés
    if (meilleureArrivee) usedPointageIds.add(meilleureArrivee.id);
    if (meilleurDepart) usedPointageIds.add(meilleurDepart.id);

    // Calculer la durée réelle
    let dureeReelleMin = null;
    if (meilleureArrivee && meilleurDepart) {
      dureeReelleMin = meilleurDepart.linearMin - meilleureArrivee.linearMin;
    }

    appariements.push({
      segmentIndex: idx + 1,
      segment: { debut, fin, dureeMin },
      arrivee: meilleureArrivee ? {
        id: meilleureArrivee.id,
        horodatage: meilleureArrivee.horodatage,
        heure: meilleureArrivee.parisTime,
        ecartMinutes: meilleureArrivee.linearMin - debutMin // négatif = en avance, positif = en retard
      } : null,
      depart: meilleurDepart ? {
        id: meilleurDepart.id,
        horodatage: meilleurDepart.horodatage,
        heure: meilleurDepart.parisTime,
        ecartMinutes: meilleurDepart.linearMin - finMin // négatif = parti tôt, positif = heures sup
      } : null,
      dureeReelleMin,
      dureePrevueMin: dureeMin,
      ecartDureeMin: dureeReelleMin != null ? dureeReelleMin - dureeMin : null
    });
  });

  // Identifier les pointages non utilisés (hors planning)
  const horsPlanning = pointagesEnrichis
    .filter(p => !usedPointageIds.has(p.id))
    .map(p => ({
      pointage: { id: p.id, type: p.type, horodatage: p.horodatage },
      parisTime: p.parisTime,
      parisMinutes: p.parisMinutes
    }));

  // Identifier les segments sans aucun pointage
  const segmentsSansPointage = appariements
    .filter(a => !a.arrivee && !a.depart)
    .map(a => ({ segment: a.segment, index: a.segmentIndex }));

  return { appariements, horsPlanning, segmentsSansPointage };
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUPAGE PAR JOUR BUSINESS (remplace grouperPointagesAvecNuit)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Groupe les pointages par jour business (cutoff 05:00)
 * REMPLACE : grouperPointagesAvecNuit, grouperPointagesParEmployeJourAvecNuit
 * 
 * @param {Array} pointages - Liste de pointages avec horodatage
 * @returns {Map<string, Array>} Map jour business "YYYY-MM-DD" → pointages[]
 */
function grouperParJourBusiness(pointages) {
  const parJour = new Map();
  
  for (const p of pointages) {
    if (!p.horodatage) continue;
    const jour = getBusinessDay(p.horodatage);
    if (!parJour.has(jour)) parJour.set(jour, []);
    parJour.get(jour).push(p);
  }
  
  // Trier chaque jour par horodatage
  for (const [, pts] of parJour) {
    pts.sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage));
  }
  
  return parJour;
}

/**
 * Groupe les pointages par employé + jour business
 * REMPLACE : grouperPointagesParEmployeJourAvecNuit
 * 
 * @param {Array} pointages - Liste de pointages avec horodatage et userId
 * @returns {Map<string, Array>} Map "userId_YYYY-MM-DD" → pointages[]
 */
function grouperParEmployeJourBusiness(pointages) {
  const parEmployeJour = new Map();
  
  for (const p of pointages) {
    if (!p.horodatage) continue;
    const jour = getBusinessDay(p.horodatage);
    const key = `${p.userId}_${jour}`;
    if (!parEmployeJour.has(key)) parEmployeJour.set(key, []);
    parEmployeJour.get(key).push(p);
  }
  
  // Trier
  for (const [, pts] of parEmployeJour) {
    pts.sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage));
  }
  
  return parEmployeJour;
}

// ═══════════════════════════════════════════════════════════════════════════
// DÉTECTION SHIFT NUIT / TARDIF (version unique centralisée)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Détermine si un shift est de nuit ou tardif (fin ≥ 20h ou traverse minuit)
 * REMPLACE : isShiftDeNuitOuTardif (duplicaté dans rapportController + statsRoutes)
 * 
 * @param {Object} shift - Objet shift avec segments
 * @returns {boolean}
 */
function isShiftTardifOuNuit(shift) {
  if (!shift) return false;
  const segments = parseSegments(shift.segments);
  
  for (const seg of segments) {
    const start = seg.start || seg.debut;
    const end = seg.end || seg.fin;
    if (!start || !end) continue;
    
    const startMin = hhmmToMinutes(start);
    const endMin = hhmmToMinutes(end);
    if (startMin == null || endMin == null) continue;
    
    // Traverse minuit : fin < début (ex: 22:00 → 01:00)
    if (endMin < startMin) return true;
    // Fin tardive : ≥ 20:00
    if (endMin >= 20 * 60) return true;
  }
  return false;
}

/**
 * Calcule la durée totale planifiée d'un shift en minutes
 * Gère correctement les segments qui traversent minuit
 * 
 * @param {Object} shift - Objet shift avec segments
 * @returns {number} durée en minutes
 */
function getDureeShiftMinutes(shift) {
  if (!shift) return 0;
  const segments = parseSegments(shift.segments);
  let total = 0;
  
  for (const seg of segments) {
    const start = seg.start || seg.debut;
    const end = seg.end || seg.fin;
    if (!start || !end) continue;
    
    const { dureeMin } = lineariserSegment(start, end);
    total += dureeMin;
  }
  return total;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Configuration
  BUSINESS_DAY_CUTOFF_HOUR,
  MATCHING_WINDOWS,
  
  // Helpers temps
  hhmmToMinutes,
  minutesToHHMM,
  horodatageToParisMinutes,
  horodatageToParisHHMM,
  horodatageToParisDate,
  
  // Jour business
  getBusinessDay,
  getBusinessDayBoundsUTC,
  getBusinessRangeBoundsUTC,
  
  // Appariement segment/pointage (COEUR)
  lineariserSegment,
  lineariserPointage,
  apparierPointagesParSegment,
  
  // Groupage
  grouperParJourBusiness,
  grouperParEmployeJourBusiness,
  
  // Shift utils
  isShiftTardifOuNuit,
  getDureeShiftMinutes,
};
