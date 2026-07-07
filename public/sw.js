self.addEventListener('install', (event) => {
  console.log('[sw] install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[sw] activate');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
