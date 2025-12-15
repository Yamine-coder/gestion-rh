import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';
import { canInstallPWA, promptInstall, isPWAInstalled } from '../serviceWorkerRegistration';

/**
 * Composant pour afficher une bannière d'installation PWA
 * S'affiche automatiquement sur mobile si l'app n'est pas déjà installée
 */
const InstallPWABanner = ({ 
  autoShow = true, 
  delay = 5000, // Délai avant affichage (5 secondes)
  position = 'bottom' // 'top' ou 'bottom'
}) => {
  const [showBanner, setShowBanner] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installée
    if (isPWAInstalled()) {
      setInstalled(true);
      return;
    }

    // Vérifier si déjà refusée récemment
    const dismissedAt = localStorage.getItem('pwa-banner-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Ne pas afficher pendant 7 jours après refus
      }
    }

    // Listener pour détecter quand l'installation est possible
    const checkInstallable = () => {
      setCanInstall(canInstallPWA());
    };

    // Vérifier immédiatement
    checkInstallable();

    // Et aussi quand l'événement se déclenche
    window.addEventListener('beforeinstallprompt', () => {
      setCanInstall(true);
      
      // Auto-afficher après le délai
      if (autoShow) {
        setTimeout(() => {
          setShowBanner(true);
        }, delay);
      }
    });

    // Si déjà installable, afficher après délai
    if (canInstallPWA() && autoShow) {
      setTimeout(() => {
        setShowBanner(true);
      }, delay);
    }

    // Écouter l'installation
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', checkInstallable);
    };
  }, [autoShow, delay]);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const result = await promptInstall();
      if (result.outcome === 'accepted') {
        setInstalled(true);
        setShowBanner(false);
      }
    } catch (error) {
      console.error('Erreur installation PWA:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  // Ne rien afficher si pas installable ou déjà installée
  if (!canInstall || installed || !showBanner) {
    return null;
  }

  return (
    <div 
      className={`
        fixed left-2 right-2 sm:left-4 sm:right-4 z-[60] 
        ${position === 'bottom' ? 'bottom-20 sm:bottom-24' : 'top-4'}
        animate-[slideUp_0.3s_ease-out]
      `}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-w-md mx-auto">
        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            {/* Icône */}
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-[#cf292c]/10 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-[#cf292c]" />
            </div>
            
            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <h3 className="text-gray-900 font-semibold text-sm sm:text-base">
                Installer l'application
              </h3>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5 leading-snug">
                Accédez rapidement à Chez Antoine depuis votre écran d'accueil
              </p>
            </div>
            
            {/* Bouton fermer */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Boutons */}
          <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 text-gray-500 hover:text-gray-700 text-xs sm:text-sm font-medium transition-colors rounded-xl hover:bg-gray-100"
            >
              Plus tard
            </button>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 bg-[#cf292c] hover:bg-[#b52429] text-white rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 transition-all disabled:opacity-50 shadow-md"
            >
              {installing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Installation...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Installer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Bouton d'installation PWA compact
 * À utiliser dans les settings ou la navbar
 */
export const InstallPWAButton = ({ className = '' }) => {
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setCanInstall(canInstallPWA());
    
    window.addEventListener('beforeinstallprompt', () => {
      setCanInstall(true);
    });
    
    window.addEventListener('appinstalled', () => {
      setCanInstall(false);
    });
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await promptInstall();
    } catch (error) {
      console.error('Erreur installation:', error);
    } finally {
      setInstalling(false);
    }
  };

  if (!canInstall || isPWAInstalled()) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      disabled={installing}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-[#cf292c] hover:bg-[#b52429] 
        text-white rounded-lg text-sm font-medium 
        transition-all disabled:opacity-50
        ${className}
      `}
    >
      {installing ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Installer l'app
    </button>
  );
};

/**
 * Indicateur PWA installée
 * Affiche un badge si l'app est en mode standalone
 */
export const PWAInstalledBadge = () => {
  if (!isPWAInstalled()) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
      <Check className="w-3 h-3" />
      App installée
    </div>
  );
};

export default InstallPWABanner;
