// server/constants/shiftTypes.js
// Types de shifts unifiés pour toute l'application

/**
 * Types de shifts valides
 * - travail : Jour de travail planifié (remplace présence, NORMAL, matin, soir, coupure)
 * - repos : Jour de repos planifié
 * - absence : Absence (maladie, congé, etc.)
 */

const SHIFT_TYPES = {
  TRAVAIL: 'travail',   // Jour de travail - TYPE PRINCIPAL
  REPOS: 'repos',       // Jour de repos
  ABSENCE: 'absence'    // Absence planifiée
};

// Types qui comptent comme du travail (pour les calculs d'heures)
const WORK_TYPES = [SHIFT_TYPES.TRAVAIL];

// Types qui ne comptent PAS comme du travail
const NON_WORK_TYPES = [SHIFT_TYPES.REPOS, SHIFT_TYPES.ABSENCE];

// Tous les types valides
const ALL_VALID_TYPES = Object.values(SHIFT_TYPES);

module.exports = {
  SHIFT_TYPES,
  WORK_TYPES,
  NON_WORK_TYPES,
  ALL_VALID_TYPES
};
