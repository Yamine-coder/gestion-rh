/**
 * 📋 Configuration centralisée des types de congés/absences (Frontend)
 * 
 * ⚠️ SOURCE UNIQUE DE VÉRITÉ pour tous les types d'absences dans l'application
 * 
 * Synchronisé avec server/config/typesConges.js
 */

export const TYPES_CONGES = {
  CP: {
    code: 'CP',
    label: 'Congés Payés',
    labelCourt: 'CP',
    icon: '🏖️',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800',
    requireJustificatif: false,
    description: 'Congés payés annuels'
  },
  
  RTT: {
    code: 'RTT',
    label: 'RTT',
    labelCourt: 'RTT',
    icon: '⏰',
    color: 'purple',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-800',
    requireJustificatif: false,
    description: 'Réduction du Temps de Travail'
  },
  
  MALADIE: {
    code: 'maladie',
    label: 'Arrêt Maladie',
    labelCourt: 'Maladie',
    icon: '🏥',
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    badgeClass: 'bg-red-100 text-red-800',
    requireJustificatif: true,
    description: 'Arrêt maladie (certificat médical obligatoire)'
  },
  
  SANS_SOLDE: {
    code: 'sans_solde',
    label: 'Congé Sans Solde',
    labelCourt: 'Sans solde',
    icon: '💸',
    color: 'gray',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    badgeClass: 'bg-gray-100 text-gray-800',
    requireJustificatif: false,
    description: 'Congé exceptionnel non rémunéré'
  },
  
  MATERNITE: {
    code: 'maternite',
    label: 'Congé Maternité',
    labelCourt: 'Maternité',
    icon: '🤰',
    color: 'pink',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    badgeClass: 'bg-pink-100 text-pink-800',
    requireJustificatif: true,
    description: 'Congé maternité (certificat médical obligatoire)'
  },
  
  PATERNITE: {
    code: 'paternite',
    label: 'Congé Paternité',
    labelCourt: 'Paternité',
    icon: '👶',
    color: 'cyan',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
    badgeClass: 'bg-cyan-100 text-cyan-800',
    requireJustificatif: true,
    description: 'Congé paternité et d\'accueil de l\'enfant'
  },
  
  DECES: {
    code: 'deces',
    label: 'Congé pour Décès',
    labelCourt: 'Décès',
    icon: '🕊️',
    color: 'slate',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200',
    badgeClass: 'bg-slate-100 text-slate-800',
    requireJustificatif: true,
    description: 'Congé pour décès d\'un proche (justificatif obligatoire)'
  },
  
  MARIAGE: {
    code: 'mariage',
    label: 'Congé Mariage',
    labelCourt: 'Mariage',
    icon: '💍',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    requireJustificatif: false,
    description: 'Congé pour mariage ou PACS'
  },
  
  FORMATION: {
    code: 'formation',
    label: 'Formation Professionnelle',
    labelCourt: 'Formation',
    icon: '📚',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    badgeClass: 'bg-indigo-100 text-indigo-800',
    requireJustificatif: false,
    description: 'Absence pour formation professionnelle'
  },
  
  AUTRE: {
    code: 'autre',
    label: 'Autre Absence',
    labelCourt: 'Autre',
    icon: '📋',
    color: 'neutral',
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-700',
    borderColor: 'border-neutral-200',
    badgeClass: 'bg-neutral-100 text-neutral-800',
    requireJustificatif: false,
    description: 'Autre type d\'absence (à préciser)'
  }
};

/**
 * Alias pour reconnaître les anciens formats de types stockés en base
 * Permet de mapper "Congé formation" -> FORMATION, "Congé maladie" -> MALADIE, etc.
 */
const TYPE_ALIASES = {
  // Format "Congé xxx" stocké en base
  'congé formation': 'FORMATION',
  'congé maladie': 'MALADIE',
  'congé maternité': 'MATERNITE',
  'congé paternité': 'PATERNITE',
  'congé décès': 'DECES',
  'congé mariage': 'MARIAGE',
  'congé sans solde': 'SANS_SOLDE',
  'congés payés': 'CP',
  
  // Autres formats possibles
  'formation': 'FORMATION',
  'maladie': 'MALADIE',
  'maternité': 'MATERNITE',
  'paternité': 'PATERNITE',
  'décès': 'DECES',
  'mariage': 'MARIAGE',
  'sans solde': 'SANS_SOLDE',
  'autre': 'AUTRE',
  'rtt': 'RTT',
  'cp': 'CP'
};

/**
 * Obtenir la configuration d'un type de congé par son code
 * @param {string} code - Code du type (ex: 'CP', 'maladie', 'Congé formation')
 * @returns {object|null} Configuration du type ou null si introuvable
 */
export function getTypeConge(code) {
  if (!code) return null;
  
  const codeNormalized = code.toUpperCase();
  const codeLower = code.toLowerCase();
  
  // 1. Recherche directe par clé TYPES_CONGES (ex: 'CP', 'RTT', 'FORMATION')
  if (TYPES_CONGES[codeNormalized]) {
    return TYPES_CONGES[codeNormalized];
  }
  
  // 2. Recherche par code ou label
  const typeByCodeOrLabel = Object.values(TYPES_CONGES).find(
    t => t.code.toUpperCase() === codeNormalized || 
         t.label.toUpperCase() === codeNormalized ||
         t.labelCourt?.toUpperCase() === codeNormalized
  );
  if (typeByCodeOrLabel) return typeByCodeOrLabel;
  
  // 3. Recherche par alias (gère "Congé formation", "Congés payés", etc.)
  const aliasKey = TYPE_ALIASES[codeLower];
  if (aliasKey && TYPES_CONGES[aliasKey]) {
    return TYPES_CONGES[aliasKey];
  }
  
  // 4. Fallback sur AUTRE si introuvable
  return TYPES_CONGES.AUTRE;
}

/**
 * Obtenir la liste de tous les types pour affichage (select, etc.)
 * @returns {object[]} Liste des types avec label et code
 */
export function getTypesForSelect() {
  return Object.values(TYPES_CONGES).map(t => ({
    value: t.code,
    label: t.label,
    icon: t.icon,
    requireJustificatif: t.requireJustificatif,
    color: t.color
  }));
}

/**
 * Vérifier si un type nécessite un justificatif
 * @param {string} code - Code du type
 * @returns {boolean} true si justificatif requis
 */
export function requireJustificatif(code) {
  const type = getTypeConge(code);
  return type ? type.requireJustificatif : false;
}

/**
 * Obtenir le badge complet pour affichage
 * @param {string} code - Code du type
 * @returns {object} Badge avec classes CSS et icône
 */
export function getTypeBadge(code) {
  const type = getTypeConge(code);
  return {
    label: type.labelCourt,
    icon: type.icon,
    class: type.badgeClass,
    bgColor: type.bgColor,
    textColor: type.textColor,
    borderColor: type.borderColor
  };
}

/**
 * Normaliser un type de congé ancien vers le nouveau format
 * Migration: 'Maladie' -> 'maladie', 'rtt' -> 'RTT', etc.
 * @param {string} ancienType - Type à normaliser
 * @returns {string} Code normalisé
 */
export function normalizeTypeConge(ancienType) {
  if (!ancienType) return 'autre';
  
  const type = getTypeConge(ancienType);
  return type ? type.code : 'autre';
}
