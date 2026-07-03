import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/jobs", "/accounts", "/settings", "/billing", "/onboarding"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
