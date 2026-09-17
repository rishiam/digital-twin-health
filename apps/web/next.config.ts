import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  async rewrites() {
    const raw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
    if (!raw) return [];
    let backendUrl = raw.trim();
    if (!backendUrl || backendUrl.includes("localhost") || backendUrl === "/") {
      return [];
    }
    if (!backendUrl.startsWith("http://") && !backendUrl.startsWith("https://")) {
      backendUrl = `https://${backendUrl}`;
    }
    const cleanUrl = backendUrl.replace(/\/+$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${cleanUrl}/api/v1/:path*`,
      },
      {
        source: "/health",
        destination: `${cleanUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
