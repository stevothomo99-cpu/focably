const CACHE_NAME = 'focably-v11-home-task-tile-parity';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/js/01-config.js',
  '/js/02-init.js',
  '/js/03-auth-onboarding.js',
  '/js/04-student.js',
  '/js/05-parent.js',
  '/js/06-teacher.js',
  '/js/07-shared.js'
];

// ── INSTALL: cache core files ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: serve from cache, fallback to network ──
self.addEventListener('fetch', event => {
  // Skip non-http requests (chrome-extension, data: etc)
  if (!event.request.url.startsWith('http')) return;

  // Only handle same-origin requests. API responses (Supabase etc) must never
  // be cached: they contain per-user data and would also be served stale.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache successful GET requests
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        return caches.match('/');
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', event => {
  let data = { title: 'Focably', body: 'You have a new update!', icon: '/icon-192.png' };
  try {
    data = event.data.json();
  } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'focably-notification',
      renotify: true,
      data: { url: data.url || '/' },
      actions: data.actions || []
    })
  );
});

// ── NOTIFICATION CLICK: open app ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If app already open, focus it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC (for offline task completions) ──
self.addEventListener('sync', event => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  // Placeholder — will sync queued task completions when back online
  console.log('Focably: syncing offline tasks...');
}
