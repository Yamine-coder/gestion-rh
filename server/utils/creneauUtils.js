/**
 * 🕐 UTILITAIRE CRÉNEAUX HORAIRES (Backend)
 * 
 * Calcule dynamiquement le créneau (midi/soir/coupure/continue) 
 * depuis les segments d'un shift.
 * Logique adaptée à la RESTAURATION
 * 
 * Plus besoin de stocker le créneau en base !
 * Le type de shift est maintenant uniquement: travail | repos | conge | absence
 */

/**
 * Calcule le créneau horaire depuis les segments d'un shift
 * 
 * @param {Array} segments - Tableau de segments [{start: "09:00", end: "14:00", type: "travail"}, ...]
 * @returns {string|null} - 'midi' | 'soir' | 'coupure' | 'continue' | null
 * 
 * Règles RESTAURATION :
 * - Midi : début < 14h ET fin <= 17h (service du midi)
 * - Soir : début >= 16h OU fin > 22h (service du soir)
 * - Coupure : plusieurs segments avec pause >= 2h entre eux
 * - Continue : début < 14h ET fin > 17h (traverse les deux services)
 */
function getCreneauFromSegments(segments) {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  // Filtrer les segments de travail (exclure pauses)
  const workSegments = segments.filter(s => 
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

  // Vérifier s'il y a une coupure (pause >= 2h entre segments)
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
 * 
 * @param {string} creneau - 'midi' | 'soir' | 'coupure' | 'continue'
 * @returns {object} - { label, color, colorHex, icon, bgClass, textClass }
 */
function getCreneauStyle(creneau) {
  const styles = {
    midi: {
      label: 'Midi',
      color: 'amber',
      colorHex: '#f59e0b',
      icon: 'Sun',
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
      textClass: 'text-amber-600 dark:text-amber-400'
    },
    soir: {
      label: 'Soir',
      color: 'indigo',
      colorHex: '#6366f1',
      icon: 'Moon',
      bgClass: 'bg-indigo-50 dark:bg-indigo-900/20',
      textClass: 'text-indigo-600 dark:text-indigo-400'
    },
    coupure: {
      label: 'Coupure',
      color: 'orange',
      colorHex: '#f97316',
      icon: 'Coffee',
      bgClass: 'bg-orange-50 dark:bg-orange-900/20',
      textClass: 'text-orange-600 dark:text-orange-400'
    },
    continue: {
      label: 'Continue',
      color: 'blue',
      colorHex: '#3b82f6',
      icon: 'Clock',
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      textClass: 'text-blue-600 dark:text-blue-400'
    },
    // Rétrocompatibilité anciens noms
    matin: {
      label: 'Midi',
      color: 'amber',
      colorHex: '#f59e0b',
      icon: 'Sun',
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
      textClass: 'text-amber-600 dark:text-amber-400'
    },
    journee: {
      label: 'Continue',
      color: 'blue',
      colorHex: '#3b82f6',
      icon: 'Clock',
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      textClass: 'text-blue-600 dark:text-blue-400'
    }
  };

  return styles[creneau] || styles.continue;
}

/**
 * Obtient les infos visuelles d'un type de shift
 * 
 * @param {string} type - 'travail' | 'repos' | 'conge' | 'absence'
 * @returns {object} - { label, color, colorHex, icon }
 */
function getShiftTypeStyle(type) {
  const styles = {
    travail: {
      label: 'Travail',
      color: 'gray',
      colorHex: '#cf292c', // Couleur marque
      icon: 'Briefcase'
    },
    repos: {
      label: 'Repos',
      color: 'slate',
      colorHex: '#64748b',
      icon: 'Home'
    },
    conge: {
      label: 'Congé',
      color: 'emerald',
      colorHex: '#10b981',
      icon: 'Plane'
    },
    absence: {
      label: 'Absence',
      color: 'red',
      colorHex: '#ef4444',
      icon: 'UserX'
    }
  };

  return styles[type?.toLowerCase()] || styles.travail;
}

module.exports = {
  getCreneauFromSegments,
  getCreneauStyle,
  getShiftTypeStyle
};
