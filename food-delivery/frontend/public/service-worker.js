// Service Worker v2.1 - Clear all caches on activation
const CACHE_NAMES_TO_DELETE = [
  'feastfleet-cache-v1',
  'feastfleet-cache-v2',
  'feastfleet-cache-v3'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    // Delete ALL caches, not just specific ones
    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );

    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    await self.registration.unregister();
    windowClients.forEach((client) => client.navigate(client.url));
  })());
});
