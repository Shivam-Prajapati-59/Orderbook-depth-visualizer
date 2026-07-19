import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.coincap.io",
      },
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
      },
    ],
  },
};

export default nextConfig;
