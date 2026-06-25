import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for lightweight Docker containers
};

export default nextConfig;