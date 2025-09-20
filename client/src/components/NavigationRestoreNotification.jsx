// components/NavigationRestoreNotification.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, X } from 'lucide-react';

const NavigationRestoreNotification = ({ 
  show, 
  onDismiss, 
  restoredDate, 
  restoredViewType, 
  sessionDuration 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300); // Attendre la fin de l'animation
  }, [onDismiss]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Auto-dismiss après 5 secondes
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, handleDismiss]);

  const formatViewType = (viewType) => {
    const types = {
      'jour': 'vue journalière',
      'semaine': 'vue hebdomadaire', 
      'mois': 'vue mensuelle'
    };
    return types[viewType] || viewType;
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(date));
  };

  const formatSessionDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    }
  };

  if (!show && !isVisible) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
    }`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-green-600" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                Position restaurée
              </p>
              <div className="mt-1 text-xs text-gray-500 space-y-1">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(restoredDate)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 rounded bg-blue-100 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded"></span>
                  </span>
                  <span className="capitalize">{formatViewType(restoredViewType)}</span>
                </div>
                {sessionDuration && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Dernière visite il y a {formatSessionDuration(sessionDuration)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationRestoreNotification;
