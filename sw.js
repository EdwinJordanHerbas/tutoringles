// TutorIngles — Service Worker
// Estrategia:
//  · Estáticos (css/js/fuentes):     cache-first con actualización en segundo plano
//  · Navegación (index.html):        network-first con fallback a caché (offline)
//  · API (/words, /stats, etc.):     siempre red — nunca cachear datos dinámicos
const VERSION     = 'tutoringles-v27';
const STATIC_CACHE = `${VERSION}-static`;

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/base.css',
  '/src/css/components.css',
  '/src/css/sections.css',
  '/src/css/pron.css',
  '/src/css/sesion.css',
  '/src/css/animations.css',
  '/src/js/app.js',
  '/src/js/voz.js',
  '/src/js/sesion.js',
  '/src/js/avisos.js',
  '/src/js/plan.js',
  '/src/js/work.js',
  '/src/js/vocab.js',
  '/src/js/speak.js',
  '/src/js/pron.js',
  '/src/js/pron-intro.js',
  '/src/js/grammar.js',
  '/src/js/exam.js',
  '/src/js/listening.js',
  '/src/js/writing.js',
  '/src/js/progress.js',
  '/src/js/settings.js'
];

// Rutas de API — nunca pasan por caché
const API_PREFIXES = [
  '/words', '/user-words', '/grammar-topics', '/grammar-progress',
  '/study-sessions', '/daily-goals', '/speaking-practice',
  '/exam-attempts', '/exam-questions', '/exam-quiz', '/curriculum',
  '/plan', '/stats', '/config', '/auth', '/health', '/pronunciation',
  '/sesion-diaria', '/push', '/situations', '/tracks', '/profile', '/reading', '/listening', '/writing', '/speaking'
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

  // Archivos propios (js/css/imágenes) → RED primero, caché de respaldo.
  //
  // Antes era al revés y tenía un efecto muy molesto: después de desplegar, la
  // app seguía ejecutando la versión anterior hasta la segunda o tercera visita,
  // porque la caché respondía antes de que diera tiempo a revalidar. Cambios ya
  // subidos parecían no existir, y se diagnosticaba como "el cambio no funciona"
  // cuando el problema era que ni siquiera se estaba ejecutando.
  //
  // Sigue funcionando sin conexión: si la red falla, responde la caché.
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(event.request, copia));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Fuentes de Google → caché primero: no cambian y así no se paga la latencia.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request)
        .then(res => {
          if (res.ok && (url.hostname.includes('gstatic') || url.hostname.includes('googleapis'))) {
            caches.open(STATIC_CACHE).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

// ── NOTIFICACIONES ───────────────────────────────────────
// El aviso diario. Es lo que hace que la app se abra: durante los diez primeros
// días en producción no había ninguno, y el resultado fueron 0 sesiones de
// estudio con toda la app ya construida.
self.addEventListener('push', (event) => {
  let datos = { titulo: 'TutorInglés', cuerpo: 'Cinco minutos de inglés.', url: '/?sesion=1' };
  try {
    if (event.data) datos = { ...datos, ...event.data.json() };
  } catch {
    if (event.data) datos.cuerpo = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon:  '/src/img/icon-192.png',
      badge: '/src/img/icon-192.png',
      lang: 'es',
      // Una etiqueta fija hace que un aviso nuevo sustituya al anterior en vez
      // de apilar notificaciones sin leer, que es lo que acaba en "silenciar".
      tag: 'tutoringles-diario',
      renotify: true,
      data: { url: datos.url || '/?sesion=1' },
    })
  );
});

// Al tocar el aviso: si la app ya está abierta se reutiliza esa pestaña en vez
// de abrir otra, y se la lleva directa a la sesión del día.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || '/?sesion=1';

  event.waitUntil((async () => {
    const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientes) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        if ('navigate' in c) await c.navigate(destino).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(destino);
  })());
});
