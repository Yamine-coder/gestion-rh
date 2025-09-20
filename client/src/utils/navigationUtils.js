// utils/navigationUtils.js
// Utilitaires pour la gestion de la navigation temporelle dans toute l'application

// Clés de stockage pour chaque composant
export const STORAGE_KEYS = {
  // Planning RH
  PLANNING_DATE: 'planningRH_currentDate',
  PLANNING_VIEW_TYPE: 'planningRH_viewType',
  PLANNING_LAST_VISIT: 'planningRH_lastVisit',
  
  // Vue Journalière RH
  DAILY_VIEW_DATE: 'vueJournaliereRH_date',
  DAILY_VIEW_LAST_VISIT: 'vueJournaliereRH_lastVisit',
  
  // Statistiques RH
  STATS_DATE_DEBUT: 'statsRH_dateDebut',
  STATS_DATE_FIN: 'statsRH_dateFin',
  STATS_PERIODE: 'statsRH_periode',
  STATS_LAST_VISIT: 'statsRH_lastVisit',
};

// Fonction générique pour sauvegarder la navigation
export const saveNavigation = (component, data) => {
  try {
    const timestamp = new Date().toISOString();
    
    switch (component) {
      case 'planningRH':
        if (data.date) localStorage.setItem(STORAGE_KEYS.PLANNING_DATE, data.date.toISOString());
        if (data.viewType) localStorage.setItem(STORAGE_KEYS.PLANNING_VIEW_TYPE, data.viewType);
        localStorage.setItem(STORAGE_KEYS.PLANNING_LAST_VISIT, timestamp);
        break;
        
      case 'vueJournaliereRH':
        if (data.date) localStorage.setItem(STORAGE_KEYS.DAILY_VIEW_DATE, data.date);
        localStorage.setItem(STORAGE_KEYS.DAILY_VIEW_LAST_VISIT, timestamp);
        break;
        
      case 'statsRH':
        if (data.dateDebut) localStorage.setItem(STORAGE_KEYS.STATS_DATE_DEBUT, data.dateDebut);
        if (data.dateFin) localStorage.setItem(STORAGE_KEYS.STATS_DATE_FIN, data.dateFin);
        if (data.periode) localStorage.setItem(STORAGE_KEYS.STATS_PERIODE, data.periode);
        localStorage.setItem(STORAGE_KEYS.STATS_LAST_VISIT, timestamp);
        break;
        
      default:
        console.warn(`Composant de navigation non supporté: ${component}`);
        break;
    }
  } catch (error) {
    console.warn(`Erreur lors de la sauvegarde de navigation pour ${component}:`, error);
  }
};

// Fonction générique pour restaurer la navigation
export const restoreNavigation = (component, defaults = {}) => {
  try {
    const now = new Date();
    
    switch (component) {
      case 'planningRH':
        const savedPlanningDate = localStorage.getItem(STORAGE_KEYS.PLANNING_DATE);
        const savedPlanningViewType = localStorage.getItem(STORAGE_KEYS.PLANNING_VIEW_TYPE);
        const savedPlanningLastVisit = localStorage.getItem(STORAGE_KEYS.PLANNING_LAST_VISIT);
        
        return {
          date: savedPlanningDate ? new Date(savedPlanningDate) : defaults.date || now,
          viewType: savedPlanningViewType || defaults.viewType || 'semaine',
          lastVisit: savedPlanningLastVisit ? new Date(savedPlanningLastVisit) : null,
          wasRestored: !!(savedPlanningDate || savedPlanningViewType)
        };
        
      case 'vueJournaliereRH':
        const savedDailyDate = localStorage.getItem(STORAGE_KEYS.DAILY_VIEW_DATE);
        const savedDailyLastVisit = localStorage.getItem(STORAGE_KEYS.DAILY_VIEW_LAST_VISIT);
        
        return {
          date: savedDailyDate || defaults.date || now.toISOString().slice(0, 10),
          lastVisit: savedDailyLastVisit ? new Date(savedDailyLastVisit) : null,
          wasRestored: !!savedDailyDate
        };
        
      case 'statsRH':
        const savedStatsDateDebut = localStorage.getItem(STORAGE_KEYS.STATS_DATE_DEBUT);
        const savedStatsDateFin = localStorage.getItem(STORAGE_KEYS.STATS_DATE_FIN);
        const savedStatsPeriode = localStorage.getItem(STORAGE_KEYS.STATS_PERIODE);
        const savedStatsLastVisit = localStorage.getItem(STORAGE_KEYS.STATS_LAST_VISIT);
        
        return {
          dateDebut: savedStatsDateDebut || defaults.dateDebut,
          dateFin: savedStatsDateFin || defaults.dateFin,
          periode: savedStatsPeriode || defaults.periode || 'mois',
          lastVisit: savedStatsLastVisit ? new Date(savedStatsLastVisit) : null,
          wasRestored: !!(savedStatsDateDebut || savedStatsDateFin || savedStatsPeriode)
        };
        
      default:
        return { wasRestored: false };
    }
  } catch (error) {
    console.warn(`Erreur lors de la restauration de navigation pour ${component}:`, error);
    return { wasRestored: false, ...defaults };
  }
};

// Vérifie si la session est récente (moins de 24h par défaut)
export const isSessionFresh = (lastVisit, maxHours = 24) => {
  if (!lastVisit) return false;
  const now = new Date();
  const diffHours = (now - lastVisit) / (1000 * 60 * 60);
  return diffHours < maxHours;
};

// Calcule la durée depuis la dernière visite en minutes
export const getSessionDuration = (lastVisit) => {
  if (!lastVisit) return null;
  const now = new Date();
  return (now - lastVisit) / (1000 * 60); // en minutes
};

// Nettoie toutes les données de navigation (utile pour déconnexion)
export const clearAllNavigation = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Erreur lors du nettoyage de la navigation:', error);
  }
};

// Hook personnalisé pour gérer la persistance automatique
export const useNavigationPersistence = (component, initialData, options = {}) => {
  const { autoSave = true, sessionMaxHours = 24 } = options;
  
  // Restaurer les données au montage
  const restoredData = restoreNavigation(component, initialData);
  
  // Fonction pour sauvegarder
  const save = (data) => {
    if (autoSave) {
      saveNavigation(component, data);
    }
  };
  
  // Vérifier si doit afficher notification de restauration
  const shouldShowNotification = () => {
    if (!restoredData.wasRestored || !restoredData.lastVisit) return false;
    return isSessionFresh(restoredData.lastVisit, sessionMaxHours);
  };
  
  return {
    restoredData,
    save,
    shouldShowNotification: shouldShowNotification(),
    sessionDuration: getSessionDuration(restoredData.lastVisit)
  };
};

const navigationUtils = {
  saveNavigation,
  restoreNavigation,
  isSessionFresh,
  getSessionDuration,
  clearAllNavigation,
  useNavigationPersistence,
  STORAGE_KEYS
};

export default navigationUtils;
