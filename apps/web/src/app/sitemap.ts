import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.app";
  const now = new Date();

  return [
    { url: base,               lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/features`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/docs`,     lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/login`,    lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
  ];
}
