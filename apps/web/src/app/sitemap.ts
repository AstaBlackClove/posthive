import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const PLATFORM_SLUGS = [
  "bluesky",
  "threads",
  "instagram",
  "linkedin",
  "mastodon",
  "youtube",
  "facebook",
];

const FEATURE_SLUGS = [
  "multi-platform-posting",
  "reels-and-stories",
  "drag-to-reschedule",
  "first-comment",
  "per-platform-overrides",
  "self-hostable",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                     lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/docs`,           lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/privacy`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/terms`,          lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  const platformRoutes: MetadataRoute.Sitemap = PLATFORM_SLUGS.map((slug) => ({
    url: `${BASE_URL}/platforms/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const featureRoutes: MetadataRoute.Sitemap = FEATURE_SLUGS.map((slug) => ({
    url: `${BASE_URL}/features/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...platformRoutes, ...featureRoutes];
}
