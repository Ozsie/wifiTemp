self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open('temperature').then(function(cache) {
      return cache.addAll([
      '/offline.html',
      '/offline.css'
      ]);
    })
  );
});

const OFFLINE_URL = 'offline.html';

self.addEventListener('fetch', event => {
  if ((event.request.method === 'GET' &&
       event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});