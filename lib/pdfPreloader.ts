/**
 * PDF Preloader — the secret to instant PDF opening.
 *
 * This module does two things proactively while the user is on the home page:
 * 1. Initializes the PDF.js worker immediately (so it's already warm when a course opens)
 * 2. Reads cached PDFs directly from the Cache API into blob URLs in memory
 *    so the course page can render instantly without any network/SW overhead.
 *
 * Module-level Map persists across React renders and page navigations (within SPA).
 */

const CACHE_NAME = 'pdf-cache-v1';

// In-memory store of pre-loaded blob URLs: original URL → blob URL
const preloadedBlobUrls = new Map<string, string>();

let workerInitialized = false;

/**
 * Initialize the PDF.js worker eagerly.
 * Must be called as early as possible (home page mount).
 */
export const initPdfWorker = () => {
  if (workerInitialized || typeof window === 'undefined') return;
  workerInitialized = true;
  // Dynamically set the worker — this causes the browser to start downloading
  // and initializing the worker thread immediately in the background.
  import('react-pdf').then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }).catch(() => {});
};

/**
 * Pre-load a cached PDF as a blob URL.
 * Returns immediately if already loaded or not cached.
 */
const preloadOne = async (url: string): Promise<void> => {
  if (preloadedBlobUrls.has(url)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    if (response) {
      const blob = await response.blob();
      if (blob.size > 0) {
        const blobUrl = URL.createObjectURL(blob);
        preloadedBlobUrls.set(url, blobUrl);
      }
    }
  } catch {
    // Silently ignore — not cached yet, will load from network
  }
};

/**
 * Pre-load all provided PDF URLs from cache into memory.
 * Call this from the home page when cached courses are detected.
 */
export const preloadCachedPdfs = (urls: string[]): void => {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  // Stagger the preloads slightly so they don't all compete for memory at once
  urls.forEach((url, i) => {
    setTimeout(() => preloadOne(url), i * 200);
  });
};

/**
 * Get the best URL to pass to PDFViewer.
 * Returns the in-memory blob URL if pre-loaded (instant!),
 * otherwise falls back to the original URL (SW intercepts from cache).
 */
export const getBestPdfUrl = (originalUrl: string): string => {
  return preloadedBlobUrls.get(originalUrl) ?? originalUrl;
};

/**
 * Check if a PDF is pre-loaded in memory.
 */
export const isPreloaded = (url: string): boolean => {
  return preloadedBlobUrls.has(url);
};
