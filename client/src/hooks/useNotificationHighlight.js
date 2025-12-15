import { useEffect, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const brand = '#cf292c';

/**
 * Hook pour gérer la mise en évidence des sections après redirection depuis une notification
 * @param {string} sectionId - L'ID de la section à surveiller
 * @returns {object} - { isHighlighted, clearHighlight }
 */
export function useNotificationHighlight(sectionId) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state || {};
  const shouldHighlight = state.fromNotification && state.highlightSection === sectionId;
  
  // État local pour maintenir le highlight pendant l'animation même après nettoyage du state
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [highlightIdState, setHighlightIdState] = useState(null);
  
  // Fonction pour nettoyer le highlight manuellement
  const clearHighlight = useCallback(() => {
    setIsHighlighted(false);
    setHighlightIdState(null);
  }, []);
  
  // Quand on arrive avec un state de notification, nettoyer IMMÉDIATEMENT le state URL
  // mais garder l'animation visible localement pendant 3 secondes
  useEffect(() => {
    if (shouldHighlight) {
      // Activer le highlight local
      setIsHighlighted(true);
      setHighlightIdState(state.highlightId);
      
      // Nettoyer le state URL IMMÉDIATEMENT pour éviter les boucles de navigation
      navigate(location.pathname, { replace: true, state: {} });
      
      // Désactiver le highlight après 3 secondes
      const timer = setTimeout(() => {
        setIsHighlighted(false);
        setHighlightIdState(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [shouldHighlight, navigate, location.pathname, state.highlightId]);
  
  return { isHighlighted, highlightId: highlightIdState, clearHighlight };
}

/**
 * Classes CSS pour l'effet de highlight
 * À appliquer sur la section concernée
 */
export const highlightStyles = {
  // Style de base pour le highlight
  base: `
    transition-all duration-500 ease-out
  `,
  // Style actif (avec animation)
  active: `
    ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900
    animate-pulse-subtle
  `,
  // Couleur de la bordure
  ringColor: `ring-[${brand}]/40`
};

/**
 * Génère les classes pour une section highlightable
 * @param {boolean} isHighlighted 
 * @returns {string} - Classes Tailwind
 */
export function getHighlightClasses(isHighlighted) {
  if (!isHighlighted) return '';
  return `ring-2 ring-[#cf292c]/30 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 shadow-lg shadow-[#cf292c]/10 animate-highlight-pulse`;
}

/**
 * Style inline pour le highlight (alternative aux classes)
 * @param {boolean} isHighlighted 
 * @returns {object} - Style object
 */
export function getHighlightStyle(isHighlighted) {
  if (!isHighlighted) return {};
  return {
    boxShadow: `0 0 0 3px ${brand}20, 0 4px 20px ${brand}15`,
    transition: 'box-shadow 0.5s ease-out'
  };
}

export default useNotificationHighlight;
