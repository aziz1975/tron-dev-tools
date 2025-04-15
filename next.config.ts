import type { NextConfig } from "next";
import dotenv from "dotenv";

// Load environment variables from .env and .env.local
dotenv.config();

const nextConfig: NextConfig = {
  env: {
    TRON_PRO_API_KEY: process.env.TRON_PRO_API_KEY,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
