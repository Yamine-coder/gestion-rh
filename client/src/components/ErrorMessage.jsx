import React from 'react';

/**
 * Composant d'affichage d'erreur réutilisable
 * @param {Object} props
 * @param {string} props.message - Message d'erreur à afficher
 * @param {string} props.type - Type d'erreur ('error', 'warning', 'info')
 * @param {Function} props.onDismiss - Fonction à appeler quand l'utilisateur ferme l'erreur
 * @param {Object} props.className - Classes CSS additionnelles
 */
const ErrorMessage = ({ message, type = 'error', onDismiss, className = '' }) => {
  if (!message) return null;
  
  // Différents styles selon le type d'erreur
  const styles = {
    error: 'bg-red-50 border-red-500 text-red-800',
    warning: 'bg-amber-50 border-amber-500 text-amber-800',
    info: 'bg-blue-50 border-blue-500 text-blue-800',
    success: 'bg-green-50 border-green-500 text-green-800',
  };
  
  const baseStyle = 'px-4 py-3 rounded-md mb-3 border flex justify-between items-start';
  
  return (
    <div className={`${baseStyle} ${styles[type]} ${className}`} role="alert">
      <div className="flex-1">
        <p className="font-medium">{message}</p>
      </div>
      {onDismiss && (
        <button 
          type="button" 
          className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-current hover:bg-red-100 inline-flex items-center justify-center h-6 w-6 rounded-md focus:outline-none"
          onClick={onDismiss}
          aria-label="Fermer"
        >
          <span className="sr-only">Fermer</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
