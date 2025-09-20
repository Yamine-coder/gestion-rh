/**
 * Utilitaires de gestion du temps standardisés sur le fuseau Europe/Paris
 * Toutes les fonctions de ce module garantissent une cohérence temporelle
 */

/**
 * Convertit un objet Date en chaîne heure Europe/Paris (HH:MM)
 */
function getParisTimeString(date) {
  if (!date) return null;
  
  // Convertir vers le fuseau Europe/Paris
  const parisTime = new Date(date.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
  const hours = parisTime.getHours().toString().padStart(2, '0');
  const minutes = parisTime.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Convertit un objet Date en chaîne date Europe/Paris (YYYY-MM-DD)
 * Optionnellement applique un cutoffHour (si heure < cutoff => veille)
 * NOTE: Les horodatages en base sont en UTC; on considère qu'ils représentent déjà l'heure locale affichée.
 * Pour le découpage business (cutoff 05:00), on applique directement sur l'heure UTC.
 */
function getParisDateString(date, options = {}) {
  if (!date) return null;
  const base = date instanceof Date ? new Date(date) : new Date(date);
  // Projection fiable en heure locale Paris (gère DST)
  let paris = new Date(base.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

  if (options.cutoffHour !== undefined) {
    if (paris.getHours() < options.cutoffHour) {
      paris.setDate(paris.getDate() - 1); // recule sur la veille locale
    }
  }
  // Formater manuellement (évite décalage de toISOString qui repart en UTC)
  const y = paris.getFullYear();
  const m = String(paris.getMonth() + 1).padStart(2, '0');
  const d = String(paris.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Crée un objet Date à partir d'une date string en considérant le fuseau Europe/Paris
 */
function createParisDate(dateString) {
  if (!dateString) return null;
  
  // Si c'est déjà une instance Date, la retourner telle quelle
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
 * Obtient la date courante en format YYYY-MM-DD selon le fuseau Europe/Paris
 */
function getCurrentParisDateString() {
  const now = new Date();
  return getParisDateString(now);
}

/**
 * Obtient l'heure courante en format HH:MM selon le fuseau Europe/Paris
 */
function getCurrentParisTimeString() {
  const now = new Date();
  return getParisTimeString(now);
}

/**
 * Calcule l'écart en minutes entre deux heures au format HH:MM
 * avec gestion du passage à minuit en Europe/Paris
 */
function calculateTimeGapMinutes(plannedTime, actualTime) {
  if (!plannedTime || !actualTime) return null;
  
  // Convertir HH:MM en minutes pour l'heure prévue
  const [hPlanned, mPlanned] = plannedTime.split(':').map(Number);
  const minutesPlanned = hPlanned * 60 + mPlanned;

  // Extraire HH:MM de l'heure réelle
  let actualTimeFormatted = actualTime;
  if (actualTime.includes(':')) {
    const parts = actualTime.split(':');
    actualTimeFormatted = `${parts[0]}:${parts[1]}`;
  }
  
  const [hActual, mActual] = actualTimeFormatted.split(':').map(Number);
  let minutesActual = hActual * 60 + mActual;

  // Gestion du passage à minuit
  if (minutesActual < 240 && minutesPlanned > 1200) { // Si actual < 4h et planned > 20h
    minutesActual += 24 * 60; // Ajouter 24h à l'heure réelle
  }

  // Calcul : prévu - réel
  // Un écart positif signifie une arrivée anticipée (réel < prévu)
  // Un écart négatif signifie un retard (réel > prévu)
  return minutesPlanned - minutesActual;
}

/**
 * Clé de jour business avec cutoff (par défaut 05:00). Wrapper explicite.
 * @param {Date|string} date
 * @param {number} cutoffHour
 */
function getParisBusinessDayKey(date, cutoffHour = 5) {
  return getParisDateString(date, { cutoffHour });
}

module.exports = {
  getParisTimeString,
  getParisDateString,
  getParisBusinessDayKey,
  createParisDate,
  getCurrentParisDateString,
  getCurrentParisTimeString,
  calculateTimeGapMinutes
};
