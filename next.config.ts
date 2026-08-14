import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  customWorkerSrc: "worker", // This merges our custom worker/index.js with the auto-generated PWA worker
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: false, // Enable in dev so you can test offline mode locally!
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
