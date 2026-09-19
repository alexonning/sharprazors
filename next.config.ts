import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: { "@/db/runtime": "./db/runtime.node.ts" },
  },
};

export default nextConfig;
