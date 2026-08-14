const CACHE_NAME = 'pdf-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept requests for PDF courses
  if (url.pathname.startsWith('/courses/') && url.pathname.endsWith('.pdf')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Check if the PDF is fully cached
        const cachedResponse = await cache.match(event.request.url);
        
        if (cachedResponse) {
          // If it's a range request, we need to handle it properly from the cached Blob
          const rangeHeader = event.request.headers.get('range');
          if (rangeHeader) {
            const blob = await cachedResponse.blob();
            // Removed /g flag which causes stateful regex bugs
            const bytes = /^bytes=(\d+)-(\d+)?$/.exec(rangeHeader.trim());
            if (bytes) {
              const start = Number(bytes[1]);
              const end = bytes[2] ? Number(bytes[2]) : blob.size - 1;
              const sliced = blob.slice(start, end + 1);
              
              return new Response(sliced, {
                status: 206,
                statusText: 'Partial Content',
                headers: {
                  'Content-Type': 'application/pdf',
                  'Content-Range': `bytes ${start}-${end}/${blob.size}`,
                  'Content-Length': String(sliced.size),
                  'Accept-Ranges': 'bytes'
                }
              });
            }
          }
          
          // Return full cached response if no range requested, but ensure Accept-Ranges is present
          const blob = await cachedResponse.blob();
          return new Response(blob, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Length': String(blob.size),
              'Accept-Ranges': 'bytes'
            }
          });
        }

        // If not cached, fetch from network normally
        return fetch(event.request);
      })
    );
  }
});
