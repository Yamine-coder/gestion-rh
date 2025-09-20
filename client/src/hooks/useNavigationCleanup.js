// hooks/useNavigationCleanup.js
import { useEffect } from 'react';
import { clearAllNavigation } from '../utils/navigationUtils';

// Hook pour nettoyer la navigation lors de la déconnexion
export const useNavigationCleanup = () => {
  const clearNavigation = () => {
    clearAllNavigation();
    console.log('Navigation data cleared on logout');
  };

  return { clearNavigation };
};

// Hook pour nettoyer automatiquement la navigation au démontage du composant
export const useAutoNavigationCleanup = (shouldClear = false) => {
  useEffect(() => {
    return () => {
      if (shouldClear) {
        clearAllNavigation();
      }
    };
  }, [shouldClear]);
};

export default useNavigationCleanup;
