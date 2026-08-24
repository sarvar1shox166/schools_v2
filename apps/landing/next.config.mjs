/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker image uchun — faqat build tomonidan kuzatilgan node_modules
  // qismini o'zida saqlaydigan minimal server bundle chiqaradi.
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
