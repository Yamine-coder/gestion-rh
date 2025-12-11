import { useEffect, useCallback } from 'react';
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
  const isHighlighted = state.fromNotification && state.highlightSection === sectionId;
  
  // Fonction pour nettoyer le state après l'animation
  const clearHighlight = useCallback(() => {
    if (isHighlighted) {
      // Remplacer le state sans le highlight après un délai
      setTimeout(() => {
        navigate(location.pathname, { replace: true, state: {} });
      }, 3000); // 3 secondes d'animation
    }
  }, [isHighlighted, navigate, location.pathname]);
  
  // Auto-clear après montage si highlighted
  useEffect(() => {
    if (isHighlighted) {
      clearHighlight();
    }
  }, [isHighlighted, clearHighlight]);
  
  return { isHighlighted, highlightId: state.highlightId, clearHighlight };
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
