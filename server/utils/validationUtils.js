/**
 * Utilitaire de validation pour les paramètres de requête.
 */

/**
 * Parse un entier depuis un paramètre de requête avec validation.
 * @param {string} value - La valeur à parser
 * @param {string} [name='paramètre'] - Nom du paramètre (pour messages d'erreur)
 * @returns {{ value: number|null, error: string|null }} 
 */
function safeParseInt(value, name = 'paramètre') {
  if (value === undefined || value === null || value === '') {
    return { value: null, error: `${name} est requis` };
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return { value: null, error: `${name} doit être un nombre valide` };
  }
  return { value: parsed, error: null };
}

/**
 * Valide une date au format YYYY-MM-DD.
 * @param {string} dateStr - La chaîne date à valider
 * @returns {boolean}
 */
function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

module.exports = { safeParseInt, isValidDateString };
