import type { NextConfig } from "next";
import path from "path";

// Vercel compiles browser endpoints into the bundle. Missing Preview values
// would otherwise use the production defaults in the clients and proxies.
if (process.env.VERCEL_ENV === "preview" || process.env.UREMO_ENVIRONMENT === "staging") {
  const api = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!api) throw new Error("Set NEXT_PUBLIC_API_URL to the staging API before building this preview.");
  for (const target of [api, process.env.NEXT_PUBLIC_SOCKET_URL, process.env.JARVISX_BACKEND_URL]) {
    if (!target) continue;
    const url = new URL(target);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" ||
        url.search || url.hash || url.hostname.replace(/\.$/, "") === "uremo-backend.onrender.com") {
      throw new Error("Preview API, Socket.IO and JarvisX endpoints must be HTTPS staging origins.");
    }
  }
}

const nextConfig: NextConfig = {
  // Limit static generation workers on Windows development machines.
  ...(process.platform === "win32" ? { experimental: { cpus: 1 } } : {}),
  async redirects() {
    return [
      { source: "/admin/jarvisx-write", destination: "/admin/opportunities", permanent: false },
      { source: "/admin/apply-work", destination: "/admin/applications", permanent: false },
      { source: "/admin/payment-methods", destination: "/admin/payments", permanent: false },
    ];
  },
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
