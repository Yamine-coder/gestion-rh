/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UTILITAIRES CENTRALISÉS POUR LES TYPES DE POINTAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ce fichier centralise la gestion des types de pointage pour garantir
 * une cohérence dans TOUS les calculs d'heures.
 * 
 * CONTEXTE CRITIQUE:
 * - La base de données contient des pointages avec différents formats de types:
 *   • 'arrivee' / 'depart' (minuscules sans accent) - Format utilisé par l'API de pointage
 *   • 'ENTRÉE' / 'SORTIE' (majuscules avec accent) - Format utilisé par l'admin
 *   • 'arrivée' / 'départ' (minuscules avec accent) - Format potentiel
 *   • 'entrée' / 'sortie' (minuscules avec accent) - Format utilisé dans le seed
 * 
 * UTILISATION:
 * - Importer ces fonctions au lieu de faire des comparaisons directes
 * - Pour les calculs critiques (paie), toujours utiliser ces helpers
 * 
 * @module pointageTypeUtils
 * @author Audit Paie - Juin 2025
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES - Types de pointage reconnus
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tous les types reconnus comme "entrée/arrivée"
 */
const TYPES_ENTREE = ['arrivee', 'arrivée', 'entree', 'entrée', 'ENTRÉE', 'ENTREE', 'ARRIVEE', 'ARRIVÉE'];

/**
 * Tous les types reconnus comme "sortie/départ"
 */
const TYPES_SORTIE = ['depart', 'départ', 'sortie', 'SORTIE', 'DEPART', 'DÉPART'];

/**
 * Type canonique à utiliser lors de la création de pointages
 * (utilisé par l'API de pointage des employés)
 */
const TYPE_CANONIQUE_ENTREE = 'arrivee';
const TYPE_CANONIQUE_SORTIE = 'depart';

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si un type de pointage est une entrée/arrivée
 * @param {string} type - Type du pointage
 * @returns {boolean}
 */
function isEntree(type) {
  if (!type) return false;
  return TYPES_ENTREE.includes(type);
}

/**
 * Vérifie si un type de pointage est une sortie/départ
 * @param {string} type - Type du pointage
 * @returns {boolean}
 */
function isSortie(type) {
  if (!type) return false;
  return TYPES_SORTIE.includes(type);
}

/**
 * Normalise un type de pointage vers le format canonique
 * @param {string} type - Type du pointage
 * @returns {string|null} 'arrivee', 'depart', ou null si non reconnu
 */
function normaliserType(type) {
  if (!type) return null;
  if (isEntree(type)) return TYPE_CANONIQUE_ENTREE;
  if (isSortie(type)) return TYPE_CANONIQUE_SORTIE;
  return null;
}

/**
 * Filtre les pointages pour obtenir uniquement les entrées/arrivées
 * @param {Array} pointages - Liste des pointages
 * @returns {Array} Pointages d'entrée uniquement
 */
function filtrerEntrees(pointages) {
  if (!pointages || !Array.isArray(pointages)) return [];
  return pointages.filter(p => isEntree(p.type));
}

/**
 * Filtre les pointages pour obtenir uniquement les sorties/départs
 * @param {Array} pointages - Liste des pointages
 * @returns {Array} Pointages de sortie uniquement
 */
function filtrerSorties(pointages) {
  if (!pointages || !Array.isArray(pointages)) return [];
  return pointages.filter(p => isSortie(p.type));
}

/**
 * Trouve le premier pointage d'entrée
 * @param {Array} pointages - Liste des pointages (triée par horodatage)
 * @returns {Object|null} Premier pointage d'entrée ou null
 */
function trouverPremiereEntree(pointages) {
  if (!pointages || !Array.isArray(pointages)) return null;
  return pointages.find(p => isEntree(p.type)) || null;
}

/**
 * Trouve le dernier pointage de sortie
 * @param {Array} pointages - Liste des pointages (triée par horodatage)
 * @returns {Object|null} Dernier pointage de sortie ou null
 */
function trouverDerniereSortie(pointages) {
  if (!pointages || !Array.isArray(pointages)) return null;
  return filtrerSorties(pointages).pop() || null;
}

/**
 * Calcule les heures réelles travaillées à partir des pointages
 * FONCTION CRITIQUE POUR LA PAIE - Ne pas modifier sans tests approfondis
 * 
 * @param {Array} pointages - Liste des pointages triée par horodatage
 * @returns {number} Heures travaillées (arrondies à 2 décimales)
 */
function calculerHeuresReelles(pointages) {
  if (!pointages || !Array.isArray(pointages) || pointages.length < 2) {
    return 0;
  }

  let totalMinutes = 0;
  
  // Parcourir les pointages par paires (entrée + sortie)
  for (let i = 0; i < pointages.length - 1; i++) {
    const pointage1 = pointages[i];
    const pointage2 = pointages[i + 1];
    
    // Vérifier si c'est une paire entrée-sortie valide
    if (isEntree(pointage1.type) && isSortie(pointage2.type)) {
      const debut = new Date(pointage1.horodatage);
      const fin = new Date(pointage2.horodatage);
      
      // Vérifier que les dates sont valides
      if (!isNaN(debut.getTime()) && !isNaN(fin.getTime())) {
        const diffMs = fin.getTime() - debut.getTime();
        
        // Ne compter que si la durée est positive et raisonnable (< 24h)
        if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
          totalMinutes += diffMs / (1000 * 60);
        }
      }
      
      // Passer à la paire suivante
      i++;
    }
  }
  
  return Math.round((totalMinutes / 60) * 100) / 100;
}

/**
 * Détermine le prochain type de pointage à enregistrer
 * @param {Array} pointages - Liste des pointages du jour
 * @returns {string} 'arrivee' ou 'depart'
 */
function determinerProchainType(pointages) {
  if (!pointages || pointages.length === 0) {
    return TYPE_CANONIQUE_ENTREE;
  }
  
  const dernier = pointages[pointages.length - 1];
  
  if (isEntree(dernier.type)) {
    return TYPE_CANONIQUE_SORTIE;
  }
  
  return TYPE_CANONIQUE_ENTREE;
}

/**
 * Vérifie si les pointages forment des paires valides (entrée-sortie)
 * @param {Array} pointages - Liste des pointages triée par horodatage
 * @returns {Object} { valide: boolean, erreurs: string[] }
 */
function validerPairesPointages(pointages) {
  const erreurs = [];
  
  if (!pointages || pointages.length === 0) {
    return { valide: true, erreurs: [] };
  }
  
  // Vérifier que le premier pointage est une entrée
  if (!isEntree(pointages[0].type)) {
    erreurs.push('Le premier pointage n\'est pas une entrée');
  }
  
  // Vérifier l'alternance entrée/sortie
  for (let i = 1; i < pointages.length; i++) {
    const precedent = pointages[i - 1];
    const actuel = pointages[i];
    
    if (isEntree(precedent.type) && isEntree(actuel.type)) {
      erreurs.push(`Deux entrées consécutives détectées (indices ${i-1} et ${i})`);
    }
    
    if (isSortie(precedent.type) && isSortie(actuel.type)) {
      erreurs.push(`Deux sorties consécutives détectées (indices ${i-1} et ${i})`);
    }
  }
  
  return {
    valide: erreurs.length === 0,
    erreurs
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Constantes
  TYPES_ENTREE,
  TYPES_SORTIE,
  TYPE_CANONIQUE_ENTREE,
  TYPE_CANONIQUE_SORTIE,
  
  // Fonctions de vérification
  isEntree,
  isSortie,
  normaliserType,
  
  // Fonctions de filtrage
  filtrerEntrees,
  filtrerSorties,
  trouverPremiereEntree,
  trouverDerniereSortie,
  
  // Fonctions de calcul
  calculerHeuresReelles,
  determinerProchainType,
  validerPairesPointages
};
