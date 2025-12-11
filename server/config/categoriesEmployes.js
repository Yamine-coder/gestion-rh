/**
 * 🏢 Configuration centralisée des catégories d'employés (Backend)
 * 
 * ⚠️ SOURCE UNIQUE DE VÉRITÉ pour toutes les catégories dans l'application
 * 
 * Synchronisé avec client/src/utils/categoriesConfig.js
 */

const CATEGORIES_EMPLOYES = {
  // Catégories d'emploi (opérationnels)
  PIZZAIOLO: {
    code: 'Pizzaiolo',
    label: 'Pizzaiolo',
    icon: '🍕',
    color: 'orange',
    description: 'Pizzaiolo - Spécialiste des pizzas'
  },
  
  PASTAIOLO: {
    code: 'Pastaiolo',
    label: 'Pastaiolo',
    icon: '🍝',
    color: 'yellow',
    description: 'Pastaiolo - Spécialiste des pâtes'
  },
  
  CAISSE_SERVICE: {
    code: 'Caisse/Service',
    label: 'Caisse/Service',
    icon: '🔄',
    color: 'purple',
    description: 'Employé Caisse et Service'
  },
  
  ENTRETIEN: {
    code: 'Entretien',
    label: 'Entretien',
    icon: '🧹',
    color: 'lime',
    description: 'Personnel d\'entretien'
  },
  
  SECURITE: {
    code: 'Securite',
    label: 'Sécurité',
    icon: '🛡️',
    color: 'red',
    description: 'Agents de sécurité'
  },
  
  // Service administratif
  DIRECTION: {
    code: 'Direction',
    label: 'Direction',
    icon: '🎯',
    color: 'indigo',
    description: 'Direction du restaurant'
  },
  
  RH: {
    code: 'RH',
    label: 'Ressources Humaines',
    icon: '🤝',
    color: 'pink',
    description: 'Ressources Humaines'
  },
  
  INFORMATIQUE: {
    code: 'Informatique',
    label: 'Informatique',
    icon: '💻',
    color: 'blue',
    description: 'Pôle Informatique'
  }
};

// Catégories pour les employés (restaurant)
const CATEGORIES_RESTAURANT = ['Pizzaiolo', 'Pastaiolo', 'Caisse/Service', 'Entretien', 'Securite'];

// Catégories pour les admins
const CATEGORIES_ADMIN = ['Direction', 'RH', 'Informatique'];

/**
 * Obtenir la configuration d'une catégorie par son code
 * @param {string} code - Code de la catégorie
 * @returns {object|null} Configuration de la catégorie ou null
 */
function getCategorie(code) {
  if (!code) return null;
  
  const codeNormalized = code.toLowerCase();
  const categorie = Object.values(CATEGORIES_EMPLOYES).find(
    c => c.code.toLowerCase() === codeNormalized || c.label.toLowerCase() === codeNormalized
  );
  
  return categorie || null;
}

/**
 * Vérifier si une catégorie est valide
 * @param {string} code - Code à vérifier
 * @returns {boolean} true si valide
 */
function isValidCategorie(code) {
  if (!code) return false;
  const categorie = getCategorie(code);
  return categorie !== null;
}

/**
 * Obtenir la liste des catégories pour un rôle
 * @param {string} role - 'employee' ou 'admin'
 * @returns {string[]} Liste des codes de catégories
 */
function getCategoriesPourRole(role) {
  if (role === 'admin') {
    return CATEGORIES_ADMIN;
  }
  return CATEGORIES_RESTAURANT;
}

/**
 * Obtenir toutes les catégories pour affichage (select, etc.)
 * @returns {object[]} Liste des catégories
 */
function getCategoriesForSelect() {
  return Object.values(CATEGORIES_EMPLOYES).map(c => ({
    value: c.code,
    label: c.label,
    icon: c.icon
  }));
}

/**
 * Normaliser une catégorie vers le format standard
 * @param {string} ancienneCategorie - Catégorie à normaliser
 * @returns {string} Code normalisé
 */
function normalizeCategorie(ancienneCategorie) {
  if (!ancienneCategorie) return null;
  
  const categorie = getCategorie(ancienneCategorie);
  return categorie ? categorie.code : null;
}

module.exports = {
  CATEGORIES_EMPLOYES,
  CATEGORIES_RESTAURANT,
  CATEGORIES_ADMIN,
  getCategorie,
  isValidCategorie,
  getCategoriesPourRole,
  getCategoriesForSelect,
  normalizeCategorie
};
