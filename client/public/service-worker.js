// Service Worker pour Chez Antoine PWA
// Stratégie : Network First avec fallback cache pour les API
// Cache First pour les assets statiques

const CACHE_NAME = 'chez-antoine-v1';
const STATIC_CACHE = 'chez-antoine-static-v1';
const API_CACHE = 'chez-antoine-api-v1';

// Assets statiques à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/offline.html'
];

// Routes API à cacher (pour mode hors-ligne limité)
const API_ROUTES_TO_CACHE = [
  '/api/auth/me',
  '/api/categories'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Mise en cache des assets statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force l'activation immédiate
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erreur lors du cache:', error);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Supprimer les anciens caches
              return cacheName.startsWith('chez-antoine-') && 
                     cacheName !== STATIC_CACHE && 
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Prendre le contrôle immédiatement
        return self.clients.claim();
      })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-HTTP (extensions, etc.)
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Stratégie pour les requêtes API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Stratégie pour les assets statiques
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }
  
  // Stratégie pour la navigation (pages HTML)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }
  
  // Par défaut : Network First
  event.respondWith(networkFirstStrategy(request));
});

// Vérifie si c'est un asset statique
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
    url.pathname.includes('/static/')
  );
}

// Stratégie Cache First (pour assets statiques)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Mettre à jour le cache en arrière-plan
    fetchAndCache(request, STATIC_CACHE);
    return cachedResponse;
  }
  
  return fetchAndCache(request, STATIC_CACHE);
}

// Stratégie Network First (pour API et contenu dynamique)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Mettre en cache les réponses réussies des API importantes
    if (networkResponse.ok && shouldCacheApiResponse(request)) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Si offline, essayer le cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retourner une erreur JSON pour les API
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Vous êtes hors ligne', 
          offline: true 
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Stratégie Network First avec fallback page offline
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Mettre en cache la page pour utilisation offline
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Essayer le cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback vers la page offline
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback vers index.html (SPA)
    const indexPage = await caches.match('/index.html');
    if (indexPage) {
      return indexPage;
    }
    
    throw error;
  }
}

// Fetch et mise en cache
async function fetchAndCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Retourner depuis le cache si disponible
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Vérifie si la réponse API doit être cachée
function shouldCacheApiResponse(request) {
  const url = new URL(request.url);
  return API_ROUTES_TO_CACHE.some(route => url.pathname.includes(route));
}

// Gestion des messages depuis l'app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Gestion des notifications push (préparé pour futur usage)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Chez Antoine', options)
  );
});

// Gestion du clic sur notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Chercher une fenêtre existante
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Sinon ouvrir une nouvelle fenêtre
        return clients.openWindow(urlToOpen);
      })
  );
});

console.log('[SW] Service Worker chargé');
