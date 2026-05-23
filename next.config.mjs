/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Preserve trailing slashes for existing public URLs.
  trailingSlash: true,
  images: {
    // Keep remote domains list in case <img> or future usage references them
    domains: ["placehold.co", "picsum.photos", "cdn.sanity.io"],
  },
};

export default nextConfig;
