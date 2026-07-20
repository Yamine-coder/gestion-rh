// Service Worker Registration pour Chez Antoine PWA
// Basé sur les best practices de Create React App

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    // Le service worker ne fonctionne qu'en production ou sur localhost
    const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href);
    
    if (publicUrl.origin !== window.location.origin) {
      // Le service worker ne fonctionnera pas si PUBLIC_URL est sur un domaine différent
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL || ''}/service-worker.js`;

      if (isLocalhost) {
        // En localhost, vérifier si un service worker existe toujours
        checkValidServiceWorker(swUrl, config);
        
        navigator.serviceWorker.ready.then(() => {
      });
      } else {
        // En production, enregistrer simplement le service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      
      // Vérifier les mises à jour périodiquement
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Toutes les heures
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Nouveau contenu disponible, ancienne page encore ouverte

              // Callback pour l'application
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Contenu mis en cache pour utilisation hors-ligne

              // Callback pour l'application
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('❌ Erreur lors de l\'enregistrement du service worker:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  // Vérifier si le service worker peut être trouvé
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // S'assurer que le service worker existe
      const contentType = response.headers.get('content-type');
      
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // Service worker non trouvé, recharger la page
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker trouvé, procéder à l'enregistrement
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    // Ne désenregistrer QUE le service worker CRA (service-worker.js),
    // surtout pas notre /sw.js (PWA + Web Push), sinon la souscription
    // push échoue avec "no active Service Worker".
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          const scriptURL =
            (registration.active && registration.active.scriptURL) ||
            (registration.waiting && registration.waiting.scriptURL) ||
            (registration.installing && registration.installing.scriptURL) ||
            '';
          if (scriptURL.includes('/service-worker.js')) {
            registration.unregister();
          }
        });
      })
      .catch((error) => {
        console.error('Erreur lors du désenregistrement:', error);
      });
  }
}

// Utilitaire pour forcer la mise à jour du service worker
export function forceUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
    });
  }
}

// Utilitaire pour vérifier si l'app est installée en PWA
export function isPWAInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Utilitaire pour demander l'installation PWA
let deferredPrompt = null;

export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Empêcher Chrome 67+ d'afficher automatiquement le prompt
    e.preventDefault();
    // Stocker l'événement pour utilisation ultérieure
    deferredPrompt = e;
  });
  
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });
}

export function canInstallPWA() {
  return deferredPrompt !== null;
}

export async function promptInstall() {
  if (!deferredPrompt) {
    return { outcome: 'unavailable' };
  }
  
  // Afficher le prompt d'installation
  deferredPrompt.prompt();
  
  // Attendre le choix de l'utilisateur
  const { outcome } = await deferredPrompt.userChoice;
  
  // Réinitialiser le prompt
  deferredPrompt = null;
  
  return { outcome };
}

// Utilitaire pour envoyer un message au service worker
export function sendMessageToSW(message) {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

// Vider le cache du service worker
export function clearSWCache() {
  sendMessageToSW({ type: 'CLEAR_CACHE' });
}
