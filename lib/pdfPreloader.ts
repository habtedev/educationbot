/**
 * PDF Preloader — Maximum speed offline PDF opening.
 *
 * 3-layer preloading strategy (each layer is faster than the previous):
 *
 * Layer 1 — Worker init: PDF.js worker thread starts immediately on home page mount.
 * Layer 2 — ArrayBuffer: PDF is read from Cache API into RAM as raw bytes.
 * Layer 3 — Document parse: PDF structure is fully pre-parsed by the worker in background.
 *
 * Result: When user taps a course, react-pdf receives an ALREADY-PARSED document.
 * It skips fetching AND parsing and goes straight to rendering page 1.
 *
 * Module-level storage persists across React renders (no re-work on re-renders).
 */

const CACHE_NAME = 'pdf-cache-v1';

// Layer 2: raw ArrayBuffer in memory — bypasses all network/SW overhead
const preloadedBuffers = new Map<string, ArrayBuffer>();

// Layer 3: pre-parsed PDFDocumentProxy — react-pdf renders instantly from this
const preloadedDocuments = new Map<string, unknown>();

let workerInitialized = false;
let pdfjsInstance: typeof import('pdfjs-dist') | null = null;

// ─── Layer 1: Worker Init ──────────────────────────────────────────────────

export const initPdfWorker = (): void => {
  if (workerInitialized || typeof window === 'undefined') return;
  workerInitialized = true;

  import('react-pdf').then(({ pdfjs }) => {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    // Store the pdfjs instance for use in Layer 3
    pdfjsInstance = pdfjs as unknown as typeof import('pdfjs-dist');
  }).catch(() => {});
};

// ─── Layer 2: ArrayBuffer Preload ─────────────────────────────────────────

const preloadBuffer = async (url: string): Promise<ArrayBuffer | null> => {
  if (preloadedBuffers.has(url)) return preloadedBuffers.get(url)!;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    if (response) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 0) {
        preloadedBuffers.set(url, buffer);
        return buffer;
      }
    }
  } catch { /* not cached yet */ }
  return null;
};

// ─── Layer 3: PDF Document Pre-parse ──────────────────────────────────────

const preloadDocument = async (url: string): Promise<void> => {
  if (preloadedDocuments.has(url)) return;
  
  // Must have buffer first
  const buffer = await preloadBuffer(url);
  if (!buffer) return;

  // Wait for pdfjs to be initialized (it's async)
  const waitForPdfjs = (): Promise<typeof import('pdfjs-dist')> =>
    new Promise((resolve, reject) => {
      if (pdfjsInstance) return resolve(pdfjsInstance);
      let attempts = 0;
      const check = setInterval(() => {
        if (pdfjsInstance) { clearInterval(check); resolve(pdfjsInstance); }
        if (++attempts > 50) { clearInterval(check); reject(); }
      }, 100);
    });

  try {
    const pdfjs = await waitForPdfjs();
    // Clone buffer because getDocument consumes it
    const copy = buffer.slice(0);
    const loadingTask = (pdfjs as any).getDocument({ data: copy });
    const doc = await loadingTask.promise;
    preloadedDocuments.set(url, doc);
  } catch { /* ignore — will fall back to URL */ }
};

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Start preloading all provided PDF URLs from cache.
 * Staggered to avoid competing for memory/CPU at once.
 */
export const preloadCachedPdfs = (urls: string[]): void => {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  urls.forEach((url, i) => {
    // Stagger: buffer first, then parse after a short delay
    setTimeout(() => {
      preloadBuffer(url).then(() => {
        // Parse AFTER buffer is ready, staggered further to not block rendering
        setTimeout(() => preloadDocument(url), 500);
      });
    }, i * 300);
  });
};

/**
 * Get the best file object to pass to react-pdf's <Document file={...}>.
 *
 * Priority:
 *   1. Pre-parsed PDFDocumentProxy → INSTANT render, zero work
 *   2. Pre-loaded ArrayBuffer → fast, skips network/SW fetch
 *   3. Original URL string → SW serves from cache or network
 */
export const getBestPdfFile = (originalUrl: string): unknown => {
  // Layer 3: pre-parsed document (best)
  if (preloadedDocuments.has(originalUrl)) {
    return preloadedDocuments.get(originalUrl);
  }
  // Layer 2: raw buffer (second best)
  if (preloadedBuffers.has(originalUrl)) {
    // Slice a copy — react-pdf may detach the ArrayBuffer
    return { data: preloadedBuffers.get(originalUrl)!.slice(0) };
  }
  // Layer 1: URL fallback
  return originalUrl;
};

/** @deprecated use getBestPdfFile */
export const getBestPdfUrl = (originalUrl: string): string => originalUrl;

export const isPreloaded = (url: string): boolean =>
  preloadedDocuments.has(url) || preloadedBuffers.has(url);
