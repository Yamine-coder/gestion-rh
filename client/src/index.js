import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Signale au splash screen (index.html) que React est monté.
// Double requestAnimationFrame = après le premier paint.
if (typeof window !== 'undefined') {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        window.dispatchEvent(new Event('app:ready'));
      } catch (e) {
        // IE/anciens navigateurs: fallback CustomEvent
        const evt = document.createEvent('Event');
        evt.initEvent('app:ready', true, true);
        window.dispatchEvent(evt);
      }
      if (typeof window.__HIDE_SPLASH__ === 'function') {
        window.__HIDE_SPLASH__();
      }
    });
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Enregistrement du Service Worker pour PWA
// Désactivé en développement pour éviter les boucles de "nouvelle version"
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register({
    onSuccess: (registration) => {
      console.log('✅ PWA: Application prête pour utilisation hors-ligne');
    },
    onUpdate: (registration) => {
      console.log('📦 PWA: Nouvelle version disponible');
      // Stocker la registration pour mise à jour manuelle ultérieure
      window.__SW_REGISTRATION__ = registration;
    }
  });
} else {
  // En développement, désactiver le service worker
  serviceWorkerRegistration.unregister();
  console.log('🔧 DEV: Service Worker désactivé');
}

// Initialiser la détection d'installation PWA
serviceWorkerRegistration.initInstallPrompt();
