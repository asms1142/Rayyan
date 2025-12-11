import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: false, // Turbopack OFF
  },
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
