import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    domains: ["localhost"],
    // aqui você adiciona o hostname
  },
};

export default nextConfig;
