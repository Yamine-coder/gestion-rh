// utils/planningNavigation.js
// Utilitaires pour la gestion de la navigation temporelle dans le planning

export const PLANNING_STORAGE_KEYS = {
  CURRENT_DATE: 'planningRH_currentDate',
  VIEW_TYPE: 'planningRH_viewType',
  SELECTED_EMPLOYEE: 'planningRH_selectedEmployee',
  LAST_VISIT: 'planningRH_lastVisit'
};

export const VIEW_TYPES = {
  JOUR: 'jour',
  SEMAINE: 'semaine',
  MOIS: 'mois'
};

// Sauvegarde la position de navigation
export const savePlanningNavigation = (dateCourante, viewType, selectedEmployee = null) => {
  try {
    localStorage.setItem(PLANNING_STORAGE_KEYS.CURRENT_DATE, dateCourante.toISOString());
    localStorage.setItem(PLANNING_STORAGE_KEYS.VIEW_TYPE, viewType);
    localStorage.setItem(PLANNING_STORAGE_KEYS.LAST_VISIT, new Date().toISOString());
    
    if (selectedEmployee) {
      localStorage.setItem(PLANNING_STORAGE_KEYS.SELECTED_EMPLOYEE, selectedEmployee.toString());
    }
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde de la navigation:', error);
  }
};

// Récupère la position de navigation sauvegardée
export const restorePlanningNavigation = () => {
  try {
    const savedDate = localStorage.getItem(PLANNING_STORAGE_KEYS.CURRENT_DATE);
    const savedViewType = localStorage.getItem(PLANNING_STORAGE_KEYS.VIEW_TYPE);
    const selectedEmployee = localStorage.getItem(PLANNING_STORAGE_KEYS.SELECTED_EMPLOYEE);
    const lastVisit = localStorage.getItem(PLANNING_STORAGE_KEYS.LAST_VISIT);

    return {
      date: savedDate ? new Date(savedDate) : new Date(),
      viewType: savedViewType && Object.values(VIEW_TYPES).includes(savedViewType) ? savedViewType : VIEW_TYPES.SEMAINE,
      selectedEmployee: selectedEmployee ? parseInt(selectedEmployee) : null,
      lastVisit: lastVisit ? new Date(lastVisit) : null
    };
  } catch (error) {
    console.warn('Erreur lors de la récupération de la navigation:', error);
    return {
      date: new Date(),
      viewType: VIEW_TYPES.SEMAINE,
      selectedEmployee: null,
      lastVisit: null
    };
  }
};

// Vérifie si la session de navigation est récente (moins de 24h)
export const isNavigationSessionFresh = (lastVisit) => {
  if (!lastVisit) return false;
  const now = new Date();
  const diffHours = (now - lastVisit) / (1000 * 60 * 60);
  return diffHours < 24; // Session considérée comme fraîche si moins de 24h
};

// Réinitialise la navigation (utile pour logout ou nouveau contexte)
export const clearPlanningNavigation = () => {
  try {
    Object.values(PLANNING_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Erreur lors du nettoyage de la navigation:', error);
  }
};

// Fonction pour débugger - affiche l'état de navigation actuel
export const debugNavigationState = () => {
  const state = restorePlanningNavigation();
  console.log('État de navigation Planning RH:', {
    ...state,
    sessionFresh: isNavigationSessionFresh(state.lastVisit),
    timeSinceLastVisit: state.lastVisit ? `${Math.round((new Date() - state.lastVisit) / (1000 * 60))} minutes` : 'N/A'
  });
  return state;
};
