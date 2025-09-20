/**
 * Utilitaires de gestion du temps standardisés sur le fuseau Europe/Paris - Frontend
 * Toutes les fonctions de ce module garantissent une cohérence temporelle côté client
 */

/**
 * Convertit un objet Date en chaîne date Europe/Paris (YYYY-MM-DD)
 * Évite les décalages UTC en utilisant les composants locaux
 */
export function getParisDateString(date) {
  if (!date) return null;
  
  // Si c'est déjà une chaîne au bon format, la retourner
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Si c'est une chaîne contenant 'T', extraire la partie date
  if (typeof date === 'string' && date.includes('T')) {
    return date.slice(0, 10);
  }
  
  // Pour un objet Date, utiliser les composants locaux pour éviter UTC
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return null;
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Crée un objet Date à partir d'une chaîne date en évitant les décalages UTC
 */
export function createLocalDate(dateString) {
  if (!dateString) return null;
  
  // Si c'est déjà une instance Date, la retourner
  if (dateString instanceof Date) return dateString;
  
  // Pour une chaîne date (YYYY-MM-DD), créer en local pour éviter les décalages UTC
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // Mois 0-indexé en JavaScript
  }
  
  // Pour les autres formats, utiliser le constructeur standard
  return new Date(dateString);
}

/**
 * Obtient la date courante en format YYYY-MM-DD selon l'heure locale
 */
export function getCurrentDateString() {
  const now = new Date();
  return getParisDateString(now);
}

/**
 * Obtient l'heure courante en format HH:MM selon l'heure locale
 */
export function getCurrentTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Normalise une date pour éviter les problèmes de fuseau horaire
 * Version améliorée qui utilise systématiquement l'heure locale
 */
export function normalizeDateLocal(dateValue) {
  try {
    if (!dateValue) return null;
    
    // Si c'est déjà une chaîne au bon format
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    // Si c'est une chaîne contenant 'T', extraire la partie date
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
      return dateValue.slice(0, 10);
    }
    
    // Si c'est une instance de Date
    if (dateValue instanceof Date) {
      return getParisDateString(dateValue);
    }
    
    // Pour les autres cas, essayer de créer une date locale
    const dateObj = createLocalDate(dateValue);
    if (dateObj && !isNaN(dateObj.getTime())) {
      return getParisDateString(dateObj);
    }
  } catch (error) {
    console.error("Erreur de normalisation de date:", error);
  }
  
  return null;
}

/**
 * Vérifie si deux dates sont le même jour (en ignorant l'heure)
 */
export function isSameDay(date1, date2) {
  const d1 = getParisDateString(date1);
  const d2 = getParisDateString(date2);
  return d1 === d2;
}

/**
 * Vérifie si une date est aujourd'hui
 */
export function isToday(date) {
  const today = getCurrentDateString();
  const dateStr = getParisDateString(date);
  return dateStr === today;
}
