const CACHE_NAMES_TO_DELETE = [
  'feastfleet-cache-v1',
  'feastfleet-cache-v2'
];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => CACHE_NAMES_TO_DELETE.includes(cacheName) || cacheName.startsWith('feastfleet-'))
        .map((cacheName) => caches.delete(cacheName))
    );

    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    await self.registration.unregister();
    windowClients.forEach((client) => client.navigate(client.url));
  })());
});
