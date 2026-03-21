// MicroHabit AI Service Worker
// Handles: Background notifications, offline caching, PWA functionality

const CACHE_NAME = 'microhabit-v1';
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
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('❌ Cache failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate Service Worker
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

// Fetch - Serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        console.log('⚠️ Offline - serving from cache failed');
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

// Listen for messages from main app (for scheduling notifications)
self.addEventListener('message', event => {
  console.log('📨 Service Worker received message:', event.data);
  
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { habitName, time, habitId } = event.data;
    console.log(`⏰ Scheduling notification for "${habitName}" at ${time}`);
    
    // In a real implementation, you'd use Background Sync API or Push API
    // For now, we'll handle this from the main thread with setInterval
    event.ports[0].postMessage({ success: true });
  }
});

console.log('🚀 Service Worker loaded successfully!');
