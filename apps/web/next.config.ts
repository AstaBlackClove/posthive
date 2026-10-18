import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/features/reels-and-stories",
        destination: "/features/instagram-reels-scheduler",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      // Marketing pages: identical shell for all users (auth is client-side via useAuth/useEffect).
      // CDN caches the JS shell, not personalized HTML — safe to cache.
      { source: "/", headers: [{ key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" }] },
      { source: "/pricing", headers: [{ key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" }] },
      { source: "/docs", headers: [{ key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" }] },
      { source: "/blog/:path*", headers: [{ key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" }] },
      { source: "/features/:path*", headers: [{ key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" }] },
      { source: "/platforms/:path*", headers: [{ key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" }] },
      { source: "/agent", headers: [{ key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" }] },
      { source: "/terms", headers: [{ key: "Cache-Control", value: "public, s-maxage=86400, stale-while-revalidate=604800" }] },
      { source: "/privacy", headers: [{ key: "Cache-Control", value: "public, s-maxage=86400, stale-while-revalidate=604800" }] },
    ];
  },
};

export default nextConfig;
