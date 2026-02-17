import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
      },
      {
        protocol: "https",
        hostname: "hqyxyphyvtnsavzonuro.supabase.co",
      },
    ],
  },
};

export default nextConfig;
