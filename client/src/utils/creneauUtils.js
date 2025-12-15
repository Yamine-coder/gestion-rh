/**
 * 🕐 UTILITAIRE CRÉNEAUX HORAIRES (Frontend)
 * 
 * Calcule dynamiquement le créneau (matin/soir/coupure/journee) 
 * depuis les segments d'un shift.
 * 
 * Import: import { getCreneauFromSegments, getCreneauStyle } from '../utils/creneauUtils';
 */

import { Sun, Moon, Coffee, Clock, Briefcase, Home, Plane, UserX } from 'lucide-react';

/**
 * Calcule le créneau horaire depuis les segments d'un shift
 * Logique adaptée à la RESTAURATION
 * 
 * @param {Array} segments - Tableau de segments [{start: "09:00", end: "14:00", type: "travail"}, ...]
 * @returns {string|null} - 'midi' | 'soir' | 'coupure' | 'continue' | null
 */
export function getCreneauFromSegments(segments) {
  // Parser les segments si c'est une string JSON
  let parsedSegments = segments;
  if (typeof segments === 'string') {
    try {
      parsedSegments = JSON.parse(segments);
    } catch (e) {
      return null;
    }
  }
  
  if (!parsedSegments || !Array.isArray(parsedSegments) || parsedSegments.length === 0) {
    return null;
  }

  // Filtrer les segments de travail (exclure pauses)
  const workSegments = parsedSegments.filter(s => 
    s.type?.toLowerCase() !== 'pause' && 
    s.type?.toLowerCase() !== 'break'
  );

  if (workSegments.length === 0) return null;

  const firstStart = workSegments[0].start || workSegments[0].debut;
  const lastEnd = workSegments[workSegments.length - 1].end || workSegments[workSegments.length - 1].fin;
  
  const startHour = parseInt(firstStart?.split(':')[0]) || 0;
  const endHour = parseInt(lastEnd?.split(':')[0]) || 0;
  // Gérer les fins après minuit (00h, 01h, 02h)
  const adjustedEndHour = endHour < startHour ? endHour + 24 : endHour;

  // Vérifier s'il y a une coupure (pause >= 2h entre segments de travail)
  let hasBigGap = false;
  if (workSegments.length > 1) {
    for (let i = 0; i < workSegments.length - 1; i++) {
      const currentEnd = workSegments[i].end || workSegments[i].fin;
      const nextStart = workSegments[i + 1].start || workSegments[i + 1].debut;
      
      if (currentEnd && nextStart) {
        const [endH, endM] = currentEnd.split(':').map(Number);
        const [startH, startM] = nextStart.split(':').map(Number);
        const gapMinutes = (startH * 60 + startM) - (endH * 60 + endM);
        
        if (gapMinutes >= 120) { // 2h de pause = coupure
          hasBigGap = true;
          break;
        }
      }
    }
  }

  // LOGIQUE RESTAURATION
  // Coupure : 2 services séparés par une pause >= 2h
  if (hasBigGap) {
    return 'coupure';
  }
  
  // Midi : Début < 14h ET Fin <= 17h
  if (startHour < 14 && adjustedEndHour <= 17) {
    return 'midi';
  }
  
  // Soir : Début >= 16h OU (Fin > 22h et début > 14h)
  if (startHour >= 16 || (adjustedEndHour > 22 && startHour > 14)) {
    return 'soir';
  }
  
  // Continue : Début < 14h ET Fin > 17h (traverse midi et après-midi)
  if (startHour < 14 && adjustedEndHour > 17) {
    return 'continue';
  }
  
  // Fallback
  return startHour < 16 ? 'midi' : 'soir';
}

/**
 * Obtient les infos visuelles d'un créneau (terminologie restauration)
 */
export function getCreneauStyle(creneau) {
  const styles = {
    midi: {
      label: 'Service midi',
      color: 'amber',
      colorHex: '#f59e0b',
      Icon: Sun,
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
      textClass: 'text-amber-600 dark:text-amber-400'
    },
    soir: {
      label: 'Service soir',
      color: 'indigo',
      colorHex: '#6366f1',
      Icon: Moon,
      bgClass: 'bg-indigo-50 dark:bg-indigo-900/20',
      textClass: 'text-indigo-600 dark:text-indigo-400'
    },
    coupure: {
      label: 'Journée coupure',
      color: 'orange',
      colorHex: '#f97316',
      Icon: Coffee,
      bgClass: 'bg-orange-50 dark:bg-orange-900/20',
      textClass: 'text-orange-600 dark:text-orange-400'
    },
    continue: {
      label: 'Journée continue',
      color: 'blue',
      colorHex: '#3b82f6',
      Icon: Clock,
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      textClass: 'text-blue-600 dark:text-blue-400'
    },
    // Rétrocompatibilité anciens noms
    matin: {
      label: 'Service midi',
      color: 'amber',
      colorHex: '#f59e0b',
      Icon: Sun,
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
      textClass: 'text-amber-600 dark:text-amber-400'
    },
    journee: {
      label: 'Journée continue',
      color: 'blue',
      colorHex: '#3b82f6',
      Icon: Clock,
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      textClass: 'text-blue-600 dark:text-blue-400'
    }
  };

  return styles[creneau] || styles.continue;
}

/**
 * Obtient les infos visuelles d'un type de shift
 * Types: 'travail' | 'repos' | 'conge' | 'absence'
 */
export function getShiftTypeStyle(type) {
  const styles = {
    travail: {
      label: 'Travail',
      color: 'gray',
      colorHex: '#cf292c',
      Icon: Briefcase
    },
    repos: {
      label: 'Repos',
      color: 'slate',
      colorHex: '#64748b',
      Icon: Home
    },
    conge: {
      label: 'Congé',
      color: 'emerald',
      colorHex: '#10b981',
      Icon: Plane
    },
    absence: {
      label: 'Absence',
      color: 'red',
      colorHex: '#ef4444',
      Icon: UserX
    }
  };

  return styles[type?.toLowerCase()] || styles.travail;
}

/**
 * Helper: Détermine le créneau d'un shift (nouveau ou ancien format)
 * Compatible avec l'ancien système (type=matin/soir) et le nouveau (calcul depuis segments)
 */
export function getShiftCreneau(shift) {
  if (!shift) return null;
  
  // Nouveau système: calculer depuis les segments
  if (shift.segments?.length > 0) {
    return getCreneauFromSegments(shift.segments);
  }
  
  // Ancien système: le type contient le créneau - mapper vers nouveaux noms
  const typeMap = {
    'matin': 'midi',
    'journee': 'continue',
    'soir': 'soir',
    'coupure': 'coupure'
  };
  const typeLower = shift.type?.toLowerCase();
  if (typeMap[typeLower]) {
    return typeMap[typeLower];
  }
  
  return null;
}

/**
 * Helper: Est-ce un shift de travail effectif
 */
export function isWorkShift(shift) {
  if (!shift) return false;
  
  const type = shift.type?.toLowerCase();
  const workTypes = ['travail', 'matin', 'soir', 'coupure', 'journee', 'présence', 'normal', 'presence'];
  
  return workTypes.includes(type) && !shift.estEnConge;
}

/**
 * Helper: Est-ce un congé
 */
export function isCongeShift(shift) {
  if (!shift) return false;
  return shift.type?.toLowerCase() === 'conge' || shift.estEnConge === true;
}
