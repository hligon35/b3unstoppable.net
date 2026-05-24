/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Preserve trailing slashes for existing public URLs.
  trailingSlash: true,
  images: {
    domains: ["placehold.co", "picsum.photos"],
  },
};

export default nextConfig;
