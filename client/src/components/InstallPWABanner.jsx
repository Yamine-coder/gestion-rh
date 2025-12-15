import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check, Share, Plus } from 'lucide-react';
import { canInstallPWA, promptInstall, isPWAInstalled } from '../serviceWorkerRegistration';

// Détection iOS
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Détection Safari
const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

// Détection mobile
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Composant pour afficher une bannière d'installation PWA
 * Supporte iOS avec instructions manuelles
 */
const InstallPWABanner = ({ 
  autoShow = true, 
  delay = 5000,
  position = 'bottom'
}) => {
  const [showBanner, setShowBanner] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installée
    if (isPWAInstalled()) {
      setInstalled(true);
      return;
    }

    // Détecter iOS
    const iosDevice = isIOS();
    setIsIOSDevice(iosDevice);

    // Vérifier si déjà refusée récemment
    const dismissedAt = localStorage.getItem('pwa-banner-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 3) {
        return;
      }
    }

    // Pour iOS : toujours afficher sur mobile Safari
    if (iosDevice && isSafari() && isMobile()) {
      setCanInstall(true);
      if (autoShow) {
        setTimeout(() => {
          setShowBanner(true);
        }, delay);
      }
      return;
    }

    // Pour Android/Chrome : utiliser l'API standard
    const checkInstallable = () => {
      setCanInstall(canInstallPWA());
    };

    checkInstallable();

    window.addEventListener('beforeinstallprompt', () => {
      setCanInstall(true);
      if (autoShow) {
        setTimeout(() => {
          setShowBanner(true);
        }, delay);
      }
    });

    if (canInstallPWA() && autoShow) {
      setTimeout(() => {
        setShowBanner(true);
      }, delay);
    }

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', checkInstallable);
    };
  }, [autoShow, delay]);

  const handleInstall = async () => {
    if (isIOSDevice) {
      setShowIOSGuide(true);
      return;
    }
    
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
    setShowIOSGuide(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  // Ne rien afficher si pas installable ou déjà installée
  if (!canInstall || installed || !showBanner) {
    return null;
  }

  // Guide iOS
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 flex items-end justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
          {/* Header */}
          <div className="bg-[#cf292c] p-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Installer sur iPhone</h3>
              <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Steps */}
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                1
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">Appuyez sur le bouton Partager</p>
                <p className="text-gray-500 text-sm mt-1">
                  En bas de Safari, appuyez sur l'icone 
                  <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-gray-100 rounded">
                    <Share className="w-4 h-4" />
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                2
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">Faites defiler et trouvez</p>
                <p className="text-gray-500 text-sm mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded font-medium text-gray-700">
                    <Plus className="w-4 h-4" />
                    Sur l'ecran d'accueil
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                3
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium">Appuyez sur "Ajouter"</p>
                <p className="text-gray-500 text-sm mt-1">
                  L'app sera ajoutee a votre ecran d'accueil !
                </p>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t">
            <button
              onClick={handleDismiss}
              className="w-full py-3 bg-[#cf292c] hover:bg-[#b52429] text-white rounded-xl font-medium transition-colors"
            >
              J'ai compris
            </button>
          </div>
        </div>
      </div>
    );
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
                Accedez rapidement a Chez Antoine depuis votre ecran d'accueil
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
              ) : isIOSDevice ? (
                <>
                  <Share className="w-4 h-4" />
                  Comment faire ?
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
 * Bouton d'installation PWA compact (supporte iOS)
 */
export const InstallPWAButton = ({ className = '' }) => {
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    const iosDevice = isIOS();
    setIsIOSDevice(iosDevice);
    
    // iOS Safari : toujours montrer
    if (iosDevice && isSafari() && isMobile() && !isPWAInstalled()) {
      setCanInstall(true);
      return;
    }
    
    setCanInstall(canInstallPWA());
    
    window.addEventListener('beforeinstallprompt', () => {
      setCanInstall(true);
    });
    
    window.addEventListener('appinstalled', () => {
      setCanInstall(false);
    });
  }, []);

  const handleInstall = async () => {
    if (isIOSDevice) {
      setShowIOSGuide(true);
      return;
    }
    
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
    <>
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
        ) : isIOSDevice ? (
          <Share className="w-4 h-4" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Installer l'app
      </button>
      
      {/* Modal iOS */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#cf292c] p-4 text-white flex items-center justify-between">
              <h3 className="font-semibold">Installer sur iPhone</h3>
              <button onClick={() => setShowIOSGuide(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <p><strong>1.</strong> Appuyez sur <Share className="w-4 h-4 inline mx-1" /> (Partager)</p>
              <p><strong>2.</strong> Trouvez "Sur l'ecran d'accueil"</p>
              <p><strong>3.</strong> Appuyez sur "Ajouter"</p>
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 bg-[#cf292c] text-white rounded-lg font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Indicateur PWA installée
 */
export const PWAInstalledBadge = () => {
  if (!isPWAInstalled()) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
      <Check className="w-3 h-3" />
      App installee
    </div>
  );
};

export default InstallPWABanner;
