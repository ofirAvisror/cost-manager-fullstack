/**
 * Service Worker for Cost Manager PWA
 * Handles caching of static assets for offline support
 */

const CACHE_NAME = 'cost-manager-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        // Try to cache files, but don't fail if some are missing
        return Promise.allSettled(
          urlsToCache.map(function(url) {
            return fetch(url)
              .then(function(response) {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(function(error) {
                // Silently fail for individual cache misses
              });
          })
        );
      })
      .then(function() {
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('[SW] Cache install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
      
      if (oldCaches.length > 0) {
        return Promise.all(
          oldCaches.map(function(cacheName) {
            return caches.delete(cacheName);
          })
        );
      } else {
        return Promise.resolve([]);
      }
    })
    .then(function() {
      return self.clients.claim();
    })
    .catch(function(error) {
      console.error('[SW] Activation failed:', error);
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip chrome-extension and other protocols
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.startsWith('moz-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(function(response) {
            // Check if valid response
            if (!response || response.status !== 200) {
              // For navigation requests, return index.html for SPA routing
              if (event.request.mode === 'navigate') {
                return caches.match('/index.html') || response;
              }
              return response;
            }

            // Only cache same-origin responses
            if (response.type === 'basic' || response.type === 'cors') {
              // Clone the response
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch(function() {
            // If fetch fails, try to return cached index.html for navigation requests (SPA)
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // For other requests, return a basic error response
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});
