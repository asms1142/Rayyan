import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // experimental features removed if not needed
  // swcMinify is now supported by default, but keeping true is fine
  swcMinify: true,
  // Set the correct output tracing root if workspace warnings appear
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
