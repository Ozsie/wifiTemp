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
  console.log('fetch: ' + event);
  if (event.request.mode === 'navigate' ||
      (event.request.method === 'GET' &&
       event.request.headers.get('accept').includes('text/html'))) {
    console.log('Handling fetch event for', event.request.url);
    event.respondWith(
      fetch(event.request).catch(error => {
        console.log('Fetch failed; returning offline page instead.', error);
        return caches.match(OFFLINE_URL);
      })
    );
  }
});