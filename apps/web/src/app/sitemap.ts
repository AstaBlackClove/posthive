import type { MetadataRoute } from "next";

const FEATURE_SLUGS = [
  "multi-platform-posting",
  "instagram-reels-scheduler",
  "drag-to-reschedule",
  "first-comment",
  "per-platform-overrides",
  "bulk-csv-scheduling",
  "self-hostable",
];

const PLATFORM_SLUGS = [
  "bluesky",
  "threads",
  "instagram",
  "linkedin",
  "mastodon",
  "youtube",
  "facebook",
  "twitter",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";
  const now = new Date();

  return [
    { url: base,                  lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/pricing`,     lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/docs`,        lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/blog`,        lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${base}/blog/introducing-posthive`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`,     lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,       lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    ...FEATURE_SLUGS.map(slug => ({
      url: `${base}/features/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...PLATFORM_SLUGS.map(slug => ({
      url: `${base}/platforms/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${base}/login`,       lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/register`,    lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
  ];
}
