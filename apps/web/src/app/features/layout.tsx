import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore Posthive features — multi-platform posting, bulk CSV scheduling, drag-to-reschedule calendar, Reels & Stories, per-platform overrides, and more.",
  openGraph: {
    title: "Posthive Features",
    description:
      "Multi-platform posting, bulk CSV scheduling, drag-to-reschedule calendar, Reels & Stories, per-platform overrides, first comment automation, and more.",
    images: [
      {
        url: "/api/og?layout=features&title=Posthive%20Features&desc=Multi-platform%20posting%2C%20bulk%20CSV%2C%20calendar%2C%20Reels%20%26%20Stories%2C%20per-platform%20overrides%2C%20and%20more.&badge=Features",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive Features",
    description: "Multi-platform posting, bulk CSV, calendar, Reels & Stories, and more.",
  },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
