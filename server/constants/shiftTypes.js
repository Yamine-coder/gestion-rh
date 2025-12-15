// server/constants/shiftTypes.js
// Types de shifts unifiés pour toute l'application

/**
 * Types de shifts valides (V2 - Simplifié)
 * 
 * - travail : Jour de travail planifié
 * - repos   : Jour de repos planifié  
 * - conge   : Congé validé (CP, RTT, maladie...)
 * - absence : Absence non validée (no-show, injustifié...)
 * 
 * ⚠️ Les créneaux (matin/soir/coupure) sont maintenant calculés 
 *    dynamiquement depuis les segments avec getCreneauFromSegments()
 */

const SHIFT_TYPES = {
  TRAVAIL: 'travail',   // Jour de travail
  REPOS: 'repos',       // Jour de repos planifié
  CONGE: 'conge',       // Congé validé (payé, pas de malus)
  ABSENCE: 'absence'    // Absence (peut avoir malus)
};

// Types qui comptent comme du travail (pour les calculs d'heures)
const WORK_TYPES = [SHIFT_TYPES.TRAVAIL];

// Types qui ne comptent PAS comme du travail
const NON_WORK_TYPES = [SHIFT_TYPES.REPOS, SHIFT_TYPES.CONGE, SHIFT_TYPES.ABSENCE];

// Types de congé (pas de malus)
const CONGE_TYPES = [SHIFT_TYPES.CONGE];

// Types d'absence (peut avoir malus)
const ABSENCE_TYPES = [SHIFT_TYPES.ABSENCE];

// Tous les types valides
const ALL_VALID_TYPES = Object.values(SHIFT_TYPES);

// Anciens types (pour rétrocompatibilité lors des requêtes)
// Ces valeurs ont été migrées vers 'travail'
const LEGACY_WORK_TYPES = ['matin', 'soir', 'coupure', 'journee', 'présence', 'NORMAL', 'presence'];

// Helper: Est-ce un type de travail (inclut les anciens)
function isWorkType(type) {
  if (!type) return false;
  const t = type.toLowerCase();
  return WORK_TYPES.includes(t) || LEGACY_WORK_TYPES.map(l => l.toLowerCase()).includes(t);
}

// Helper: Est-ce un congé validé
function isCongeType(type, estEnConge) {
  if (!type) return false;
  // Nouveau système: type === 'conge'
  // Ancien système: estEnConge === true
  return type.toLowerCase() === SHIFT_TYPES.CONGE || estEnConge === true;
}

module.exports = {
  SHIFT_TYPES,
  WORK_TYPES,
  NON_WORK_TYPES,
  CONGE_TYPES,
  ABSENCE_TYPES,
  ALL_VALID_TYPES,
  LEGACY_WORK_TYPES,
  isWorkType,
  isCongeType
};
