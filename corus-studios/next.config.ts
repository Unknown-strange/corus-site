import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,  // use the current project directory
  },
};

export default nextConfig;
