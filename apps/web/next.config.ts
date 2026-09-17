import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
    if (!backendUrl || backendUrl.includes("localhost")) {
      return [];
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
