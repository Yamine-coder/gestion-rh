import React, { useState, useEffect } from 'react';
import logo from '../../assets/onboarding/logo.png';

/**
 * 🚀 Splash Screen - Écran de démarrage
 * S'affiche pendant le chargement des données (remplace les skeletons)
 */
export default function SplashScreen({ onComplete, isLoading = true, minDuration = 1500 }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Timer minimum pour éviter un flash trop rapide
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDuration);
    return () => clearTimeout(timer);
  }, [minDuration]);

  // Fermer quand données chargées ET temps minimum écoulé
  useEffect(() => {
    if (!isLoading && minTimeElapsed) {
      setFadeOut(true);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLoading, minTimeElapsed, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center transition-opacity duration-400 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ 
        backgroundColor: '#ffffff'
      }}
    >
      {/* Logo animé - centré */}
      <div 
        className="flex items-center justify-center"
        style={{ animation: 'logoAppear 0.8s ease-out' }}
      >
        <img 
          src={logo} 
          alt="Logo" 
          className="w-64 h-64 object-contain"
        />
      </div>

      {/* Loader discret en bas */}
      <div 
        className="absolute bottom-20 flex items-center gap-1.5"
        style={{ animation: 'fadeIn 0.5s ease-out 0.8s both' }}
      >
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Animations */}
      <style>{`
        @keyframes logoAppear {
          from { 
            opacity: 0; 
            transform: scale(0.8); 
          }
          to { 
            opacity: 1; 
            transform: scale(1); 
          }
        }
        @keyframes logoPulse {
          0%, 100% { 
            transform: scale(1); 
          }
          50% { 
            transform: scale(1.05); 
          }
        }
        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Hook pour gérer le splash screen
// ⚠️ DÉSACTIVÉ EN PRODUCTION - Le HTML Splash (index.html) suffit
// Le React SplashScreen créait une redondance (2x logo au chargement)
export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(false); // Toujours désactivé

  const completeSplash = () => {
    setShowSplash(false);
  };

  return {
    showSplash,
    completeSplash
  };
}
