/**
 * Utilitaires de gestion des dates - Côté Serveur
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * RÈGLE D'OR : Toujours utiliser ces fonctions pour manipuler les dates.
 * Ne JAMAIS faire date.toISOString().split('T')[0] directement !
 * 
 * Fonctions principales :
 * - toLocalDateString(date)     : Retourne "YYYY-MM-DD" en heure locale
 * - parseLocalDate(date)        : Parse n'importe quel format en Date
 * - isDateInPast(date)          : Vérifie si une date est passée
 * - isSameDay(date1, date2)     : Vérifie si deux dates sont le même jour
 * - getCurrentDateString()      : Retourne la date du jour "YYYY-MM-DD"
 */

/**
 * Parse une date et retourne un objet Date
 * Gère tous les formats : ISO string, YYYY-MM-DD, Date object
 * 
 * @param {string|Date} dateValue - La date à parser
 * @returns {Date|null} - Objet Date ou null si invalide
 */
function parseLocalDate(dateValue) {
  if (!dateValue) return null;
  
  // Si c'est déjà un objet Date valide
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  // Si c'est une chaîne
  if (typeof dateValue === 'string') {
    // Format YYYY-MM-DD (sans heure) - créer en LOCAL
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [year, month, day] = dateValue.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }
    
    // Format ISO avec 'T' - parser normalement
    const dateObj = new Date(dateValue);
    if (!isNaN(dateObj.getTime())) {
      return dateObj;
    }
  }
  
  // Dernier recours
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Convertit une date en chaîne YYYY-MM-DD en heure LOCALE
 * ⚠️ UTILISER CETTE FONCTION au lieu de .toISOString().split('T')[0]
 * 
 * @param {string|Date} dateValue - La date à convertir
 * @returns {string|null} - "YYYY-MM-DD" ou null si invalide
 */
function toLocalDateString(dateValue) {
  const date = parseLocalDate(dateValue);
  if (!date) return null;
  
  // Utiliser les composants LOCAUX (pas UTC !)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Obtient la date courante en format YYYY-MM-DD
 */
function getCurrentDateString() {
  return toLocalDateString(new Date());
}

/**
 * Vérifie si deux dates sont le même jour
 */
function isSameDay(date1, date2) {
  const d1 = toLocalDateString(date1);
  const d2 = toLocalDateString(date2);
  return d1 === d2;
}

/**
 * Vérifie si une date est dans le passé (jour entier)
 */
function isDateInPast(dateValue) {
  const date = parseLocalDate(dateValue);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  return compareDate < today;
}

/**
 * Vérifie si une date est aujourd'hui
 */
function isToday(dateValue) {
  return isSameDay(dateValue, new Date());
}

/**
 * Crée une date à partir d'une date et d'une heure
 * @param {string|Date} dateValue - La date
 * @param {string} timeString - L'heure "HH:MM"
 */
function createDateTime(dateValue, timeString) {
  const date = parseLocalDate(dateValue);
  if (!date) return null;
  
  const [hours, minutes] = (timeString || '00:00').split(':').map(Number);
  
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours || 0,
    minutes || 0,
    0,
    0
  );
}

/**
 * Génère un tableau de dates entre deux dates
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {string[]} - Tableau de dates "YYYY-MM-DD"
 */
function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  while (current <= end) {
    dates.push(toLocalDateString(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

module.exports = {
  parseLocalDate,
  toLocalDateString,
  getCurrentDateString,
  isSameDay,
  isDateInPast,
  isToday,
  createDateTime,
  getDateRange
};
