/**
 * 📋 Configuration centralisée des types de congés/absences
 * 
 * ⚠️ SOURCE UNIQUE DE VÉRITÉ pour tous les types d'absences dans l'application
 * 
 * Utilisé par :
 * - Validation backend (routes conges)
 * - Calculs statistiques (statsRoutes)
 * - Exports Excel/PDF (exportUtils)
 * - Génération de rapports
 */

const TYPES_CONGES = {
  CP: {
    code: 'CP',
    label: 'Congés Payés',
    labelCourt: 'CP',
    icon: '🏖️',
    color: 'blue',
    colorHex: '#3B82F6',
    requireJustificatif: false,
    description: 'Congés payés annuels'
  },
  
  RTT: {
    code: 'RTT',
    label: 'RTT',
    labelCourt: 'RTT',
    icon: '⏰',
    color: 'purple',
    colorHex: '#9333EA',
    requireJustificatif: false,
    description: 'Réduction du Temps de Travail'
  },
  
  MALADIE: {
    code: 'maladie',
    label: 'Arrêt Maladie',
    labelCourt: 'Maladie',
    icon: '🏥',
    color: 'red',
    colorHex: '#EF4444',
    requireJustificatif: true,
    description: 'Arrêt maladie (certificat médical obligatoire)'
  },
  
  SANS_SOLDE: {
    code: 'sans_solde',
    label: 'Congé Sans Solde',
    labelCourt: 'Sans solde',
    icon: '💸',
    color: 'gray',
    colorHex: '#6B7280',
    requireJustificatif: false,
    description: 'Congé exceptionnel non rémunéré'
  },
  
  MATERNITE: {
    code: 'maternite',
    label: 'Congé Maternité',
    labelCourt: 'Maternité',
    icon: '🤰',
    color: 'pink',
    colorHex: '#EC4899',
    requireJustificatif: true,
    description: 'Congé maternité (certificat médical obligatoire)'
  },
  
  PATERNITE: {
    code: 'paternite',
    label: 'Congé Paternité',
    labelCourt: 'Paternité',
    icon: '👶',
    color: 'cyan',
    colorHex: '#06B6D4',
    requireJustificatif: true,
    description: 'Congé paternité et d\'accueil de l\'enfant'
  },
  
  DECES: {
    code: 'deces',
    label: 'Congé pour Décès',
    labelCourt: 'Décès',
    icon: '🕊️',
    color: 'slate',
    colorHex: '#475569',
    requireJustificatif: true,
    description: 'Congé pour décès d\'un proche (justificatif obligatoire)'
  },
  
  MARIAGE: {
    code: 'mariage',
    label: 'Congé Mariage',
    labelCourt: 'Mariage',
    icon: '💍',
    color: 'yellow',
    colorHex: '#EAB308',
    requireJustificatif: false,
    description: 'Congé pour mariage ou PACS'
  },
  
  FORMATION: {
    code: 'formation',
    label: 'Formation Professionnelle',
    labelCourt: 'Formation',
    icon: '📚',
    color: 'indigo',
    colorHex: '#6366F1',
    requireJustificatif: false,
    description: 'Absence pour formation professionnelle'
  },
  
  AUTRE: {
    code: 'autre',
    label: 'Autre Absence',
    labelCourt: 'Autre',
    icon: '📋',
    color: 'neutral',
    colorHex: '#737373',
    requireJustificatif: false,
    description: 'Autre type d\'absence (à préciser)'
  }
};

/**
 * Obtenir la configuration d'un type de congé par son code
 * @param {string} code - Code du type (ex: 'CP', 'maladie')
 * @returns {object|null} Configuration du type ou null si introuvable
 */
function getTypeConge(code) {
  if (!code) return null;
  
  // Recherche directe par code (normalisé)
  const codeNormalized = code.toUpperCase();
  const type = Object.values(TYPES_CONGES).find(
    t => t.code.toUpperCase() === codeNormalized || t.label.toUpperCase() === codeNormalized
  );
  
  return type || null;
}

/**
 * Vérifier si un code de type de congé est valide
 * @param {string} code - Code à vérifier
 * @returns {boolean} true si valide
 */
function isValidTypeConge(code) {
  return getTypeConge(code) !== null;
}

/**
 * Obtenir la liste de tous les codes valides
 * @returns {string[]} Liste des codes
 */
function getCodesValides() {
  return Object.values(TYPES_CONGES).map(t => t.code);
}

/**
 * Obtenir la liste de tous les types pour affichage (select, etc.)
 * @returns {object[]} Liste des types avec label et code
 */
function getTypesForSelect() {
  return Object.values(TYPES_CONGES).map(t => ({
    value: t.code,
    label: t.label,
    icon: t.icon,
    requireJustificatif: t.requireJustificatif
  }));
}

/**
 * Vérifier si un type nécessite un justificatif
 * @param {string} code - Code du type
 * @returns {boolean} true si justificatif requis
 */
function requireJustificatif(code) {
  const type = getTypeConge(code);
  return type ? type.requireJustificatif : false;
}

/**
 * Normaliser un type de congé ancien vers le nouveau format
 * Migration: 'Maladie' -> 'maladie', 'rtt' -> 'RTT', etc.
 * @param {string} ancienType - Type à normaliser
 * @returns {string} Code normalisé
 */
function normalizeTypeConge(ancienType) {
  if (!ancienType) return 'autre';
  
  const type = getTypeConge(ancienType);
  return type ? type.code : 'autre';
}

module.exports = {
  TYPES_CONGES,
  getTypeConge,
  isValidTypeConge,
  getCodesValides,
  getTypesForSelect,
  requireJustificatif,
  normalizeTypeConge
};
