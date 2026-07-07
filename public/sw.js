self.addEventListener('install', (event) => {
  console.log('[sw] install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[sw] activate');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[sw] deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }),
        );
      }),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Never cache API calls or non-GET requests; always go to the network.
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request).catch(() => {
      // If offline, return a simple fallback for navigation requests.
      if (request.mode === 'navigate') {
        return new Response('Você está offline. Conecte-se à internet para usar o Quadro de Avisos.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      throw new Error('Network request failed');
    }),
  );
});
