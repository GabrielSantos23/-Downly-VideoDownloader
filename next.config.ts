import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows you to build despite lint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows you to build despite TypeScript errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
