const CACHE_NAME = 'lms-lite-cache-v1';
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/styles.css',
    '/js/main.js',
    '/js/auth.js',
    '/js/catalog.js',
    '/js/cert.js',
    '/js/db.js',
    '/js/instructor.js',
    '/js/player.js',
    '/js/quiz.js',
    '/js/router.js',
    '/js/ui.js',
    '/manifest.webmanifest',
    '/data/courses/courses.json',
    '/data/courses/js-101.json',
    '/data/courses/css-201.json',
    'https://cdn.tailwindcss.com?plugins=typography',
    'https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js',
    'https://cdn.jsdelivr.net/npm/prismjs-okaidia-theme@0.0.1/prism-okaidia.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(APP_SHELL_URLS).catch(error => {
                    console.error('Failed to cache app shell:', error);
                    // This can happen if one of the CDN links is unreachable during install.
                    // We'll log it but not fail the entire installation.
                });
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    const { request } = event;

    // For navigation requests (HTML pages), use a network-first strategy
    // to ensure the user gets the latest version of the app shell.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // If the fetch is successful, clone it and cache it.
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(request, responseToCache));
                    return response;
                })
                .catch(() => {
                    // If the network fails, serve the cached version.
                    return caches.match(request);
                })
        );
        return;
    }

    // For other requests (CSS, JS, images, data), use a cache-first strategy.
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                // If we have a cached response, return it.
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Otherwise, fetch from the network.
                return fetch(request).then(networkResponse => {
                    // And cache the new response for future use.
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(request, responseToCache));
                    return networkResponse;
                });
            })
    );
});
