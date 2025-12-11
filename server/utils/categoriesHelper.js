/**
 * Helper pour la gestion des catégories multiples
 * 
 * Le champ `categories` en base est un JSON string: '["Pizzaiolo", "Service"]'
 * Ces helpers permettent de manipuler facilement ce format.
 */

// Liste des catégories valides
const CATEGORIES_VALIDES = [
  'Pizzaiolo',
  'Pastaiolo', 
  'Caisse/Service',
  'Entretien',
  'Securite',
  'Direction',
  'RH',
  'Informatique',
  'Polyvalent'
];

/**
 * Parse le champ categories (JSON string) en tableau
 * @param {string|null} categoriesJson - Le champ categories de la BDD
 * @param {string|null} categorieFallback - L'ancien champ categorie (rétrocompatibilité)
 * @returns {string[]} Tableau de catégories
 */
function parseCategories(categoriesJson, categorieFallback = null) {
  // Si categories existe et est valide
  if (categoriesJson) {
    try {
      const parsed = JSON.parse(categoriesJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('⚠️ Erreur parsing categories:', e.message);
    }
  }
  
  // Fallback sur l'ancien champ categorie
  if (categorieFallback) {
    return [categorieFallback];
  }
  
  return [];
}

/**
 * Stringify un tableau de catégories pour stockage en BDD
 * @param {string[]} categoriesArray - Tableau de catégories
 * @returns {string|null} JSON string ou null si vide
 */
function stringifyCategories(categoriesArray) {
  if (!categoriesArray || !Array.isArray(categoriesArray) || categoriesArray.length === 0) {
    return null;
  }
  
  // Filtrer les valeurs vides et dédupliquer
  const cleaned = [...new Set(categoriesArray.filter(c => c && c.trim()))];
  
  if (cleaned.length === 0) {
    return null;
  }
  
  return JSON.stringify(cleaned);
}

/**
 * Vérifie si une catégorie est valide
 * @param {string} categorie 
 * @returns {boolean}
 */
function isValidCategorie(categorie) {
  return CATEGORIES_VALIDES.some(c => 
    c.toLowerCase() === categorie.toLowerCase()
  );
}

/**
 * Enrichit un objet user avec les catégories parsées
 * @param {object} user - L'objet user de Prisma
 * @returns {object} User avec categoriesArray ajouté
 */
function enrichUserWithCategories(user) {
  if (!user) return user;
  
  return {
    ...user,
    categoriesArray: parseCategories(user.categories, user.categorie)
  };
}

/**
 * Enrichit une liste d'users
 * @param {object[]} users 
 * @returns {object[]}
 */
function enrichUsersWithCategories(users) {
  return users.map(enrichUserWithCategories);
}

/**
 * Vérifie si un user appartient à au moins une des catégories données
 * @param {object} user - User avec categories ou categorie
 * @param {string[]} categoriesFilter - Catégories à vérifier
 * @returns {boolean}
 */
function userHasAnyCategory(user, categoriesFilter) {
  const userCategories = parseCategories(user.categories, user.categorie);
  return userCategories.some(uc => 
    categoriesFilter.some(fc => fc.toLowerCase() === uc.toLowerCase())
  );
}

/**
 * Catégorie principale (première du tableau) - pour rétrocompatibilité
 * @param {object} user 
 * @returns {string|null}
 */
function getPrimaryCategory(user) {
  const categories = parseCategories(user.categories, user.categorie);
  return categories[0] || null;
}

module.exports = {
  CATEGORIES_VALIDES,
  parseCategories,
  stringifyCategories,
  isValidCategorie,
  enrichUserWithCategories,
  enrichUsersWithCategories,
  userHasAnyCategory,
  getPrimaryCategory
};
