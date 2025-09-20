// Configuration pour la gestion du travail de nuit côté client
// Reproduction de la logique server/config/workDayConfig.js

const WORK_DAY_CONFIG = {
  // Heure de coupure : avant cette heure, on considère que c'est encore la journée précédente
  CUTOFF_HOUR: 6, // 6h du matin par défaut
  
  // Documentation des cas d'usage
  EXAMPLES: {
    // Équipe de jour classique: 8h-17h
    "equipe-jour": {
      cutoffHour: 6,
      description: "8h → 17h (pause déjeuner possible)"
    },
    
    // Équipe de nuit: 22h-6h du lendemain  
    "equipe-nuit": {
      cutoffHour: 6, 
      description: "22h → 6h+1 (traverse minuit)"
    },
    
    // Équipe très tôt: 4h-14h
    "equipe-tres-tot": {
      cutoffHour: 2, // Avant 2h = jour précédent
      description: "4h → 14h (démarrage très tôt)"
    },
    
    // Service 24h/7j avec rotation
    "service-continu": {
      cutoffHour: 6,
      description: "Rotation 3×8 avec changement d'équipe à 6h, 14h, 22h"
    }
  }
};

/**
 * Calcule les bornes de la "journée de travail" selon la logique métier
 * @param {Date} reference - Date de référence (généralement maintenant)
 * @param {number} cutoffHour - Heure de coupure (défaut: 6h)
 * @returns {Object} { debutJournee, finJournee }
 */
function getWorkDayBounds(reference = new Date(), cutoffHour = WORK_DAY_CONFIG.CUTOFF_HOUR) {
  let debutJournee, finJournee;

  if (reference.getHours() < cutoffHour) {
    // On est avant l'heure de coupure : journée de travail = hier cutoffHour → aujourd'hui cutoffHour
    debutJournee = new Date(reference);
    debutJournee.setDate(debutJournee.getDate() - 1);
    debutJournee.setHours(cutoffHour, 0, 0, 0);
    
    finJournee = new Date(reference);
    finJournee.setHours(cutoffHour, 0, 0, 0);
  } else {
    // Journée normale : aujourd'hui cutoffHour → demain cutoffHour
    debutJournee = new Date(reference);
    debutJournee.setHours(cutoffHour, 0, 0, 0);
    
    finJournee = new Date(reference);
    finJournee.setDate(finJournee.getDate() + 1);
    finJournee.setHours(cutoffHour, 0, 0, 0);
  }

  return { debutJournee, finJournee };
}

/**
 * Formate une période de travail pour l'affichage
 */
function formatWorkPeriod(debutJournee, finJournee) {
  const formatDate = (date) => date.toLocaleString('fr-FR');
  
  return {
    debut: formatDate(debutJournee),
    fin: formatDate(finJournee),
    dureeHeures: Math.round((finJournee - debutJournee) / (1000 * 60 * 60)),
    traverseMinuit: debutJournee.getDate() !== finJournee.getDate()
  };
}

/**
 * Détermine si un segment/shift traverse la coupure de journée de travail
 * Utile pour savoir si un horaire 22h-06h doit être traité sur une seule journée
 */
function isWorkDaySegment(dateStr, startTime, endTime, cutoffHour = WORK_DAY_CONFIG.CUTOFF_HOUR) {
  if (!startTime || !endTime) return false;
  
  // Parser les heures
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  // Si fin < début, c'est qu'on traverse minuit
  const crossesMidnight = (endH < startH) || (endH === startH && endM <= startM);
  
  if (!crossesMidnight) {
    // Pas de traverse de minuit : segment normal dans la même journée
    return true;
  }
  
  // Traverse minuit : vérifier si c'est dans la même journée de travail
  // Exemple : 22h-06h avec cutoff=6h → même journée de travail
  // Exemple : 23h-08h avec cutoff=6h → deux journées de travail différentes
  
  const finEnMinutes = endH * 60 + endM;
  const cutoffMinutes = cutoffHour * 60;
  
  // Si la fin est avant la coupure, c'est la même journée de travail
  return finEnMinutes <= cutoffMinutes;
}

/**
 * Convertit une date YYYY-MM-DD en journée de travail
 * Retourne la date de référence pour cette journée de travail
 */
function dateToWorkDay(dateStr, cutoffHour = WORK_DAY_CONFIG.CUTOFF_HOUR) {
  const date = new Date(dateStr + 'T12:00:00'); // Midi pour éviter les problèmes de timezone
  const { debutJournee } = getWorkDayBounds(date, cutoffHour);
  
  // Retourner la date de début de journée de travail au format YYYY-MM-DD
  const y = debutJournee.getFullYear();
  const m = String(debutJournee.getMonth() + 1).padStart(2, '0');
  const d = String(debutJournee.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Groupe les shifts selon la logique de journée de travail
 * Au lieu de grouper par date calendaire, groupe par journée de travail
 */
function groupShiftsByWorkDay(shifts, cutoffHour = WORK_DAY_CONFIG.CUTOFF_HOUR) {
  const grouped = new Map();
  
  shifts.forEach(shift => {
    const workDayDate = dateToWorkDay(shift.date, cutoffHour);
    
    if (!grouped.has(shift.employeId)) {
      grouped.set(shift.employeId, new Map());
    }
    
    if (!grouped.get(shift.employeId).has(workDayDate)) {
      grouped.get(shift.employeId).set(workDayDate, []);
    }
    
    grouped.get(shift.employeId).get(workDayDate).push(shift);
  });
  
  return grouped;
}

/**
 * Étend une plage de dates pour inclure les segments qui pourraient traverser minuit
 * Exemple : pour afficher le 2024-08-24, on doit aussi récupérer les shifts du 2024-08-23
 * qui finissent après la coupure (ex: shift 22h-06h du 23/08)
 */
function extendDateRangeForNightShifts(dates, cutoffHour = WORK_DAY_CONFIG.CUTOFF_HOUR) {
  if (!dates.length) return [];
  
  const extended = new Set();
  
  dates.forEach(date => {
    const dateStr = typeof date === 'string' ? date : 
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Ajouter la date elle-même
    extended.add(dateStr);
    
    // Ajouter aussi le jour précédent pour capturer les shifts de nuit
    const prevDay = new Date(dateStr + 'T12:00:00');
    prevDay.setDate(prevDay.getDate() - 1);
    const prevDayStr = `${prevDay.getFullYear()}-${String(prevDay.getMonth() + 1).padStart(2, '0')}-${String(prevDay.getDate()).padStart(2, '0')}`;
    extended.add(prevDayStr);
  });
  
  return Array.from(extended).sort();
}

export {
  WORK_DAY_CONFIG,
  getWorkDayBounds,
  formatWorkPeriod,
  isWorkDaySegment,
  dateToWorkDay,
  groupShiftsByWorkDay,
  extendDateRangeForNightShifts
};
