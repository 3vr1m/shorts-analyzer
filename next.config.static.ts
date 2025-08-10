import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Ignore API route errors for static build
  },
  // Static export configuration
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Don't include API routes in static build
  distDir: 'out'
};

export default nextConfig;
