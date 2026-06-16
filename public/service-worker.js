// Biblia Online — Service Worker v11
// Estrategia híbrida: Cache-first para assets, Network-first para API

const CACHE_NAME = 'biblia-online-cache-v11';
const API_CACHE_NAME = 'biblia-online-api-v11';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/css/style.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/games.js',
  '/js/notebook.js',
  '/manifest.json',
  '/images/logo.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png',
  '/images/backgrounds/mountain_sunrise.png',
  '/images/backgrounds/misty_forest.png',
  '/images/backgrounds/peaceful_lake.png',
  '/images/backgrounds/starry_sky.png',
  '/images/backgrounds/golden_field.png'
];

const API_ROUTES = ['/api/bible/verse-of-the-day', '/api/bible/versions', '/api/bible/books'];

// Instalación: Precachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precacheando assets estáticos...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación: Limpiar caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[SW] Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Escuchar mensajes del cliente para activación inmediata
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: Estrategia inteligente por tipo de petición
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones no GET
  if (request.method !== 'GET') {
    return;
  }

  // Estrategia para API: Network-first con fallback a cache
  if (url.pathname.startsWith('/api/')) {
    // Solo cachear rutas de API específicas (lectura)
    if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            const clone = networkResponse.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
            return networkResponse;
          })
          .catch(() => {
            return caches.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Respuesta offline genérica para API
              return new Response(
                JSON.stringify({ offline: true, message: 'Sin conexión. Algunos datos pueden estar desactualizados.' }),
                { headers: { 'Content-Type': 'application/json' } }
              );
            });
          })
      );
    }
    return; // No cachear otras APIs (POST/PUT/DELETE)
  }

  // Estrategia para assets: Cache-first con revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.log('[SW] Fallo de red:', err);
          // Para navegación, devolver index.html como fallback (SPA behavior)
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          throw err;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Notificación cuando la app está lista offline
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
