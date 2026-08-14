import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  customWorkerSrc: "worker",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false,
  workboxOptions: {
    // All assets here are PRECACHED on first install — guaranteed offline!
    additionalManifestEntries: [
      { url: '/pdf.worker.min.js', revision: '1' },
      { url: '/telegram-web-app.js', revision: '1' },
      { url: '/manifest.json', revision: '1' },
    ],
    // Runtime caching: catch fonts, cmaps, and any other static assets as they are used
    runtimeCaching: [
      {
        // Cache ALL standard_fonts files (PDF fallback fonts)
        urlPattern: /\/standard_fonts\/.+/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'pdf-fonts-v1',
          expiration: { maxEntries: 50, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        // Cache ALL cmaps files (PDF character maps)
        urlPattern: /\/cmaps\/.+/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'pdf-cmaps-v1',
          expiration: { maxEntries: 500, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        // Cache the PDF worker
        urlPattern: /\/pdf\.worker\.min\.js/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'pdf-worker-v1',
          expiration: { maxEntries: 1, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        // Cache Telegram SDK
        urlPattern: /\/telegram-web-app\.js/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'telegram-sdk-v1',
          expiration: { maxEntries: 1, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        // App pages — Network first with offline fallback
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'app-shell-v1',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
