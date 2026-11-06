import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Limit static generation workers on Windows development machines.
  ...(process.platform === "win32" ? { experimental: { cpus: 2 } } : {}),
  async redirects() {
    return [{ source: "/admin/jarvisx-write", destination: "/admin/opportunities", permanent: false }];
  },
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
