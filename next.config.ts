import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    domains: [ 'localhost',
      'server-mediaflow-mk.onrender.com',
      'mediaflow-mk.onrender.com',],
    // aqui você adiciona o hostname
    
  },
};

export default nextConfig;
