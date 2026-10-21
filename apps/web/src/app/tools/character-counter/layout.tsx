import type { Metadata } from "next";
import type { ReactNode } from "react";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

export const metadata: Metadata = {
  title: "Social Media Character Counter — Free Tool | Posthive",
  description: "Check character limits for Twitter/X (280), Instagram (2,200), LinkedIn (3,000), Bluesky (300), Threads (500), and 12 more platforms. Free, instant, no sign-up.",
  keywords: ["social media character counter", "twitter character counter", "instagram character limit", "linkedin character limit", "bluesky character limit", "threads character limit"],
  alternates: { canonical: `${WEB_URL}/tools/character-counter` },
  openGraph: {
    title: "Social Media Character Counter — Free Tool",
    description: "Check character limits for Twitter/X, Instagram, LinkedIn, Bluesky, Threads, and 12 more platforms. Instant, free, no sign-up.",
    url: `${WEB_URL}/tools/character-counter`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Media Character Counter — Free Tool",
    description: "Check character limits for Twitter/X (280), Instagram (2,200), LinkedIn (3,000), Bluesky (300), and more. Free, instant.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
