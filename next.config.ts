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
};

export default nextConfig;
