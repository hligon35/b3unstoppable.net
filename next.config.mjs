import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

initOpenNextCloudflareForDev();

export default function nextConfig(phase) {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    // Keep dev and production build artifacts separate so `next build`
    // cannot invalidate the active `next dev` runtime on Windows.
    distDir: isDevelopmentServer ? '.next-dev' : '.next',
    // Preserve trailing slashes for existing public URLs.
    trailingSlash: true,
    images: {
      domains: ["placehold.co", "picsum.photos"],
    },
  };
}
