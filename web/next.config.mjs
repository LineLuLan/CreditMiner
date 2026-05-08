/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: false,
  },
  async rewrites() {
    // Proxy /api/* to Spring Boot in development to avoid CORS quirks.
    // Disabled in production — frontend talks to API_URL directly.
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_API_PROXY === "true") {
      return [
        {
          source: "/api/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api"}/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
