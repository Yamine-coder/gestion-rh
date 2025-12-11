/**
 * Utilitaires de gestion du temps standardisés sur le fuseau Europe/Paris - Frontend
 * ══════════════════════════════════════════════════════════════════════════════════
 * 
 * RÈGLE D'OR : Toujours utiliser ces fonctions pour manipuler les dates.
 * Ne JAMAIS faire new Date(dateString).split('T')[0] directement !
 * 
 * Fonctions principales :
 * - parseLocalDate(date)      : Convertit n'importe quel format en Date locale
 * - toLocalDateString(date)   : Retourne "YYYY-MM-DD" en heure locale
 * - toLocalTimeString(date)   : Retourne "HH:MM" en heure locale
 * - isShiftInPast(shiftDate, shiftTime) : Vérifie si un créneau est passé
 * - isShiftStarted(shiftDate, shiftTime) : Vérifie si un créneau a commencé
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS DE BASE - CONVERSION DE DATES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse une date et retourne un objet Date en heure LOCALE
 * Gère tous les formats : ISO string, YYYY-MM-DD, Date object
 * 
 * @param {string|Date} dateValue - La date à parser
 * @returns {Date|null} - Objet Date en heure locale ou null si invalide
 */
export function parseLocalDate(dateValue) {
  if (!dateValue) return null;
  
  // Si c'est déjà un objet Date valide
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  // Si c'est une chaîne
  if (typeof dateValue === 'string') {
    // Format YYYY-MM-DD (sans heure) - créer en LOCAL pour éviter UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [year, month, day] = dateValue.split('-').map(Number);
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }
    
    // Format ISO avec 'T' (ex: "2025-12-06T11:00:00.000Z")
    // On crée d'abord la Date (qui sera en UTC) puis on extrait les composants LOCAUX
    const dateObj = new Date(dateValue);
    if (!isNaN(dateObj.getTime())) {
      return dateObj; // Retourne l'objet Date, les composants locaux seront utilisés après
    }
  }
  
  // Dernier recours
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Convertit une date en chaîne YYYY-MM-DD en heure LOCALE
 * ⚠️ UTILISER CETTE FONCTION au lieu de date.toISOString().split('T')[0]
 * 
 * @param {string|Date} dateValue - La date à convertir
 * @returns {string|null} - "YYYY-MM-DD" ou null si invalide
 */
export function toLocalDateString(dateValue) {
  const date = parseLocalDate(dateValue);
  if (!date) return null;
  
  // Utiliser les composants LOCAUX (pas UTC !)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Convertit une date en chaîne HH:MM en heure LOCALE
 * 
 * @param {string|Date} dateValue - La date à convertir
 * @returns {string|null} - "HH:MM" ou null si invalide
 */
export function toLocalTimeString(dateValue) {
  const date = parseLocalDate(dateValue);
  if (!date) return null;
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Crée un objet Date à partir d'une date (YYYY-MM-DD) et une heure (HH:MM)
 * 
 * @param {string|Date} dateValue - La date 
 * @param {string} timeString - L'heure au format "HH:MM"
 * @returns {Date|null} - Objet Date complet ou null si invalide
 */
export function createLocalDateTime(dateValue, timeString) {
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

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS DE COMPARAISON - POUR LES SHIFTS ET CRÉNEAUX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si un shift/créneau est dans le passé (date entière passée)
 * 
 * @param {string|Date} shiftDate - La date du shift
 * @returns {boolean}
 */
export function isShiftInPast(shiftDate) {
  const date = parseLocalDate(shiftDate);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const shiftDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  
  return shiftDay < today;
}

/**
 * Vérifie si un shift/créneau a déjà commencé
 * 
 * @param {string|Date} shiftDate - La date du shift
 * @param {string} startTime - L'heure de début "HH:MM"
 * @returns {boolean}
 */
export function isShiftStarted(shiftDate, startTime) {
  const shiftStart = createLocalDateTime(shiftDate, startTime || '00:00');
  if (!shiftStart) return false;
  
  return new Date() >= shiftStart;
}

/**
 * Vérifie si un shift commence dans moins de X minutes
 * 
 * @param {string|Date} shiftDate - La date du shift
 * @param {string} startTime - L'heure de début "HH:MM"
 * @param {number} minutes - Nombre de minutes
 * @returns {boolean}
 */
export function isShiftStartingWithin(shiftDate, startTime, minutes) {
  const shiftStart = createLocalDateTime(shiftDate, startTime || '00:00');
  if (!shiftStart) return false;
  
  const now = new Date();
  const threshold = new Date(shiftStart.getTime() - minutes * 60 * 1000);
  
  return now >= threshold && now < shiftStart;
}

/**
 * Calcule le temps restant avant le début d'un shift
 * 
 * @param {string|Date} shiftDate - La date du shift
 * @param {string} startTime - L'heure de début "HH:MM"
 * @returns {{ hours: number, minutes: number, totalMinutes: number, isPast: boolean }}
 */
export function getTimeUntilShift(shiftDate, startTime) {
  const shiftStart = createLocalDateTime(shiftDate, startTime || '00:00');
  if (!shiftStart) return { hours: 0, minutes: 0, totalMinutes: 0, isPast: true };
  
  const now = new Date();
  const diff = shiftStart.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, totalMinutes: 0, isPast: true };
  }
  
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return { hours, minutes, totalMinutes, isPast: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES - COMPARAISONS SIMPLES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si deux dates sont le même jour (en ignorant l'heure)
 */
export function isSameDay(date1, date2) {
  const d1 = toLocalDateString(date1);
  const d2 = toLocalDateString(date2);
  return d1 === d2;
}

/**
 * Vérifie si une date est aujourd'hui
 */
export function isToday(date) {
  return isSameDay(date, new Date());
}

/**
 * Vérifie si une date est demain
 */
export function isTomorrow(date) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

/**
 * Obtient la date courante en format YYYY-MM-DD
 */
export function getCurrentDateString() {
  return toLocalDateString(new Date());
}

/**
 * Obtient l'heure courante en format HH:MM
 */
export function getCurrentTimeString() {
  return toLocalTimeString(new Date());
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS DE FORMATAGE - AFFICHAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formate une date pour affichage humain
 * 
 * @param {string|Date} dateValue - La date
 * @param {object} options - Options de formatage Intl
 * @returns {string}
 */
export function formatDateDisplay(dateValue, options = {}) {
  const date = parseLocalDate(dateValue);
  if (!date) return '';
  
  const defaultOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...options
  };
  
  try {
    return date.toLocaleDateString('fr-FR', defaultOptions);
  } catch {
    return toLocalDateString(dateValue) || '';
  }
}

/**
 * Formate une date courte (ex: "Lun 6 déc")
 */
export function formatShortDate(dateValue) {
  const date = parseLocalDate(dateValue);
  if (!date) return '';
  
  try {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  } catch {
    return toLocalDateString(dateValue) || '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALIASES POUR COMPATIBILITÉ AVEC L'ANCIEN CODE
// ═══════════════════════════════════════════════════════════════════════════════

// Anciennes fonctions - redirigent vers les nouvelles
export const getParisDateString = toLocalDateString;
export const createLocalDate = parseLocalDate;
export const normalizeDateLocal = toLocalDateString;
