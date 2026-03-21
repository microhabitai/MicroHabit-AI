// MicroHabit AI Service Worker
// Handles: Background notifications, offline caching, PWA functionality

const CACHE_NAME = 'microhabit-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching app shell and assets');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('❌ Cache failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate Service Worker and clean old caches
self.addEventListener('activate', event => {
  console.log('✅ Service Worker activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch - Network first, then cache, then offline fallback
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response
        const responseClone = response.clone();
        
        // Cache the new response for offline use
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If external resource (like SaaShub badge), return empty response
            if (event.request.url.includes('saashub') || 
                event.request.url.includes('badge') ||
                event.request.url.includes('external')) {
              return new Response('', { status: 200 });
            }
            
            // For other requests, return offline page or empty
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event.notification.tag);
  event.notification.close();
  
  // Open/focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app is already open, focus it
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Listen for messages from main app
self.addEventListener('message', event => {
  console.log('📨 Service Worker received message:', event.data);
  
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { habitName, time, habitId } = event.data;
    console.log(`⏰ Scheduling notification for "${habitName}" at ${time}`);
    event.ports[0].postMessage({ success: true });
  }
});

console.log('🚀 Service Worker loaded successfully!');