/**
 * PDF Preloader — Ultra-fast RAM caching with STABLE OBJECT REFERENCES for react-pdf.
 *
 * Pre-reads PDF binary files directly from CacheStorage into RAM Uint8Arrays
 * on home page load. Stores stable object references in a Map so react-pdf receives
 * the EXACT SAME object instance on every render.
 *
 * This prevents react-pdf from detecting a "file change", which previously caused
 * worker task cancellations, document reloads, and hard refreshes.
 */

const CACHE_NAME = 'pdf-cache-v1';

// In-memory RAM store: PDF URL -> ArrayBuffer
const preloadedBuffers = new Map<string, ArrayBuffer>();

// STABLE OBJECT REFERENCES store: PDF URL -> { data: Uint8Array }
// Crucial: react-pdf compares `file === prevProps.file`. If a new object is returned
// on each render, react-pdf destroys the worker thread and reloads from page 1!
const preloadedFileObjects = new Map<string, { data: Uint8Array }>();

let workerInitialized = false;

/**
 * Warm up PDF.js worker thread immediately on home page mount.
 */
export const initPdfWorker = (): void => {
  if (workerInitialized || typeof window === 'undefined') return;
  workerInitialized = true;

  import('react-pdf').then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }).catch(() => {});
};

/**
 * Pre-read a single cached PDF into RAM as an ArrayBuffer & create stable object reference.
 */
export const preloadBuffer = async (url: string): Promise<ArrayBuffer | null> => {
  if (preloadedBuffers.has(url)) return preloadedBuffers.get(url)!;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    if (response) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 0) {
        preloadedBuffers.set(url, buffer);
        // Create STABLE object reference for react-pdf file prop
        preloadedFileObjects.set(url, { data: new Uint8Array(buffer) });
        return buffer;
      }
    }
  } catch {
    // Not cached yet
  }
  return null;
};

/**
 * Pre-read multiple cached PDFs into RAM.
 */
export const preloadCachedPdfs = (urls: string[]): void => {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  urls.forEach((url, i) => {
    setTimeout(() => {
      preloadBuffer(url);
    }, i * 50);
  });
};

/**
 * Get the exact file prop object for react-pdf's <Document file={...}>.
 *
 * Returns:
 *   1. Stable { data: Uint8Array } reference if pre-loaded in RAM (INSTANT 0ms fetch & NO worker reload!)
 *   2. originalUrl string if not preloaded (Service Worker serves from cache)
 */
export const getBestPdfFile = (originalUrl: string): unknown => {
  if (preloadedFileObjects.has(originalUrl)) {
    return preloadedFileObjects.get(originalUrl)!; // RETURN EXACT SAME REF!
  }
  return originalUrl;
};

export const getBestPdfUrl = (originalUrl: string): string => originalUrl;

export const isPreloaded = (url: string): boolean => preloadedFileObjects.has(url);
