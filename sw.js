// TutorIngles — Service Worker
// Estrategia:
//  · Estáticos (css/js/fuentes):     cache-first con actualización en segundo plano
//  · Navegación (index.html):        network-first con fallback a caché (offline)
//  · API (/words, /stats, etc.):     siempre red — nunca cachear datos dinámicos
const VERSION     = 'tutoringles-v1';
const STATIC_CACHE = `${VERSION}-static`;

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/base.css',
  '/src/css/components.css',
  '/src/css/sections.css',
  '/src/css/animations.css',
  '/src/js/app.js',
  '/src/js/vocab.js',
  '/src/js/speak.js',
  '/src/js/grammar.js',
  '/src/js/exam.js',
  '/src/js/progress.js'
];

// Rutas de API — nunca pasan por caché
const API_PREFIXES = [
  '/words', '/user-words', '/grammar-topics', '/grammar-progress',
  '/study-sessions', '/daily-goals', '/speaking-practice',
  '/exam-attempts', '/stats', '/config', '/auth', '/health'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      Promise.all(PRECACHE.map(url =>
        fetch(new Request(url, { cache: 'reload' }))
          .then(res => res.ok ? cache.put(url, res) : null)
          .catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Solo HTTPS (en local también funciona con localhost)
  if (!event.request.url.startsWith('https://') && !event.request.url.startsWith('http://localhost')) return;

  const url = new URL(event.request.url);

  // Solo GET; POST/PUT/DELETE van directo a red
  if (event.request.method !== 'GET') return;

  // API → siempre red
  if (url.origin === location.origin &&
      API_PREFIXES.some(p => url.pathname === p || url.pathname.startsWith(p + '/'))) {
    return;
  }

  // Navegación → network-first, fallback al index cacheado (modo offline)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Estáticos (mismo origen + Google Fonts) → cache-first con revalidación
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request)
        .then(res => {
          if (res.ok && (
            url.origin === location.origin ||
            url.hostname.includes('gstatic') ||
            url.hostname.includes('googleapis')
          )) {
            caches.open(STATIC_CACHE).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
