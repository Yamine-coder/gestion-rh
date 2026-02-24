// components/NavigationRestoreNotification.jsx
import React, { useState, useEffect, useCallback } from 'react';

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
    setTimeout(() => onDismiss(), 300);
  }, [onDismiss]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        handleDismiss();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, handleDismiss]);

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  };

  if (!show && !isVisible) return null;

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      <div className="pointer-events-auto inline-flex items-center gap-2 bg-white text-gray-800 text-xs font-medium px-3.5 py-2 rounded-full shadow-lg border border-red-100 ring-1 ring-red-200/50">
        <span className="w-1.5 h-1.5 bg-[#cf292c] rounded-full flex-shrink-0 animate-pulse" />
        <span>Position restaurée · <span className="text-[#cf292c] font-semibold">{formatDate(restoredDate)}</span></span>
        <button
          onClick={handleDismiss}
          className="ml-1 p-0.5 rounded-full text-gray-400 hover:text-[#cf292c] hover:bg-red-50 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NavigationRestoreNotification;
