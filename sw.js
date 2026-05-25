// =============================================
// SERVICE WORKER — Cache con versión automática
// =============================================
// IMPORTANTE: Cada vez que hagas un deploy, cambia solo el número de CACHE_VERSION.
// Eso invalida todo el caché viejo y los usuarios verán la versión nueva de inmediato.
// Ejemplo: '1.0.0' → '1.0.1' → '1.1.0'

const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `tienda-cache-v${CACHE_VERSION}`;

// Archivos que se cachean en la instalación inicial
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/script.js',
    '/styles.css'
];

// ── Instalación: guarda los archivos base en caché ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    // Activa el nuevo SW inmediatamente sin esperar a que se cierren las pestañas
    self.skipWaiting();
});

// ── Activación: elimina cachés de versiones anteriores ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Eliminando caché viejo:', key);
                        return caches.delete(key);
                    })
            )
        )
    );
    // Toma control de todas las pestañas abiertas de inmediato
    self.clients.claim();
});

// ── Fetch: Network First con fallback a caché ──
// Siempre intenta la red primero. Si falla (offline), sirve desde caché.
// Esto garantiza que los usuarios SIEMPRE vean la versión más reciente cuando tienen internet.
self.addEventListener('fetch', event => {
    // Solo intercepta peticiones GET del mismo origen
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // No interceptar peticiones a APIs externas (Firebase, Firestore, etc.)
    const externalDomains = ['firestore.googleapis.com', 'identitytoolkit.googleapis.com', 'googleapis.com', 'firebaseapp.com'];
    if (externalDomains.some(domain => url.hostname.includes(domain))) return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Respuesta de red exitosa: actualiza el caché y devuelve la respuesta
                if (networkResponse && networkResponse.status === 200) {
                    const cloned = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                }
                return networkResponse;
            })
            .catch(() => {
                // Sin red: sirve desde caché (modo offline)
                return caches.match(event.request);
            })
    );
});

// ── Mensaje desde la página: forzar actualización ──
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
