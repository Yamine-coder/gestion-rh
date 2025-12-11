// Service Worker pour MonPlanning PWA
const CACHE_NAME = 'monplanning-v1';
const STATIC_CACHE = 'monplanning-static-v1';
const DYNAMIC_CACHE = 'monplanning-dynamic-v1';

// Ressources à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/home',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Mise en cache des ressources statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de cache : Network First avec fallback sur cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer les requêtes vers des domaines externes (sauf API)
  if (!url.origin.includes(self.location.origin) && !url.pathname.includes('/api/')) {
    return;
  }

  // Pour les requêtes API : Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cloner et mettre en cache la réponse
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback sur le cache si offline
          return caches.match(request);
        })
    );
    return;
  }

  // Pour les ressources statiques : Cache First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Mettre à jour le cache en arrière-plan
        fetch(request).then((response) => {
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, response);
          });
        });
        return cachedResponse;
      }

      // Si pas en cache, récupérer du réseau
      return fetch(request).then((response) => {
        // Mettre en cache pour la prochaine fois
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      });
    }).catch(() => {
      // Page offline de fallback pour les navigations
      if (request.mode === 'navigate') {
        return caches.match('/offline.html');
      }
    })
  );
});

// Gestion des messages (pour forcer la mise à jour)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync pour les actions offline (futur)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
  if (event.tag === 'sync-pointages') {
    // Synchroniser les pointages en attente
    event.waitUntil(syncPointages());
  }
});

async function syncPointages() {
  // À implémenter : synchroniser les pointages faits offline
  console.log('[SW] Synchronisation des pointages...');
}
