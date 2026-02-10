/**
 * Utilitaire pour parser les segments de shifts.
 * Centralise la logique de parsing JSON → Array.
 */

/**
 * Parse les segments d'un shift.
 * Gère les cas : null/undefined, tableau, string JSON, ou valeur invalide.
 * @param {string|Array|null} segments - Segments en JSON string ou Array
 * @returns {Array} - Tableau de segments parsés
 */
function parseSegments(segments) {
  if (!segments) return [];
  if (Array.isArray(segments)) return segments;
  if (typeof segments === 'string') {
    try {
      const parsed = JSON.parse(segments);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  return [];
}

module.exports = { parseSegments };
