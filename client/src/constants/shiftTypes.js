// client/src/constants/shiftTypes.js
// Types de shifts unifiés pour toute l'application

/**
 * Types de shifts valides
 * - travail : Jour de travail planifié (remplace présence, NORMAL, matin, soir, coupure)
 * - repos : Jour de repos planifié
 * - absence : Absence (maladie, congé, etc.)
 */

export const SHIFT_TYPES = {
  TRAVAIL: 'travail',   // Jour de travail - TYPE PRINCIPAL
  REPOS: 'repos',       // Jour de repos
  ABSENCE: 'absence'    // Absence planifiée
};

// Types qui comptent comme du travail (pour les calculs d'heures)
export const WORK_TYPES = [SHIFT_TYPES.TRAVAIL];

// Types qui ne comptent PAS comme du travail
export const NON_WORK_TYPES = [SHIFT_TYPES.REPOS, SHIFT_TYPES.ABSENCE];

// Tous les types valides
export const ALL_VALID_TYPES = Object.values(SHIFT_TYPES);

// Helper pour vérifier si un shift est de type travail
export const isWorkShift = (shift) => {
  return shift?.type === SHIFT_TYPES.TRAVAIL;
};

// Helper pour vérifier si un segment est un extra (heures au noir)
export const isExtraSegment = (segment) => {
  return segment?.isExtra === true;
};

export default SHIFT_TYPES;
