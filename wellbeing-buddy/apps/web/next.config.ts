import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "galactic-wishlists.vercel.app",
        "*.vercel.app",
      ],
    },
  },
};

export default nextConfig;
