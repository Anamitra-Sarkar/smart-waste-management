// Service Worker for Smart Waste Management System
// Updated to avoid caching /api/* so you don't get stale "5 bins" forever.
const CACHE_NAME = 'smart-waste-v1.0.1';
const urlsToCache = [
    '/',                    // static shell only
    '/static/css/style.css',
    '/static/js/app.js'
];

// Install service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

// Network-first strategy; never cache API responses
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always bypass cache for API calls
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // For static assets, try network first then fall back to cache
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
        )
    );
});
