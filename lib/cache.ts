const CACHE_NAME = 'pdf-cache-v1';

export const cachePdf = async (url: string, onProgress?: (progress: number) => void): Promise<void> => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    let loaded = 0;
    const reader = response.body?.getReader();
    const chunks = [];
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          loaded += value.length;
          chunks.push(value);
          if (total && onProgress) {
            onProgress(Math.round((loaded / total) * 100));
          }
        }
      }
      
      const blob = new Blob(chunks, { type: 'application/pdf' });
      const newResponse = new Response(blob, {
        headers: { 
          'Content-Type': 'application/pdf',
          'Content-Length': String(blob.size),
          'Accept-Ranges': 'bytes'
        }
      });
      await cache.put(url, newResponse);
    } else {
      await cache.put(url, response);
    }
  } catch (error) {
    console.error(`Failed to cache ${url}`, error);
    throw error;
  }
};

export const getCachedPdfUrl = async (url: string): Promise<string | null> => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(url);
    
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (error) {
    console.error(`Failed to get cached PDF for ${url}`, error);
    return null;
  }
};

export const checkIsCached = async (url: string): Promise<boolean> => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(url);
    return !!cachedResponse;
  } catch (error) {
    return false;
  }
};
