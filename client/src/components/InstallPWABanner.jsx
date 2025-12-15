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
        fixed left-0 right-0 z-50 mx-4 
        ${position === 'bottom' ? 'bottom-4' : 'top-4'}
        animate-slide-up
      `}
    >
      <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icône */}
            <div className="flex-shrink-0 w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-brand-primary" />
            </div>
            
            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-base">
                Installer l'application
              </h3>
              <p className="text-slate-400 text-sm mt-0.5">
                Accédez rapidement à Chez Antoine depuis votre écran d'accueil
              </p>
            </div>
            
            {/* Bouton fermer */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Boutons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 px-4 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Plus tard
            </button>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 py-2.5 px-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
      
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
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
        bg-brand-primary hover:bg-brand-primary/90 
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
