import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Disable type checking during build since it's checked locally/CI
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disable eslint check during build
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/ws-monitoring',
        destination: process.env.WS_SERVER_URL || 'http://localhost:6002', 
      },
    ];
  },
};

export default nextConfig;
