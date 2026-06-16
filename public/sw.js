// Service worker mínimo para instalabilidad PWA + offline básico del app shell.
// Sube el número de versión del cache para invalidar versiones viejas.
const CACHE = 'tolisten-v1'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Navegaciones: network-first (HTML siempre fresco), fallback al shell si está offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  // Estáticos del mismo origen: cache-first con relleno perezoso.
  // Las llamadas a Supabase son de otro origen → no se interceptan acá.
  const url = new URL(request.url)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              const copy = res.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
              return res
            })
            .catch(() => cached)
      )
    )
  }
})
