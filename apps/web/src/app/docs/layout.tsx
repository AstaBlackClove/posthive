import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Posthive documentation — quick start, platform setup, bulk CSV scheduling, post templates, self-hosting, API reference and more.",
  openGraph: {
    title: "Posthive Documentation",
    description:
      "Quick start, platform setup, bulk CSV scheduling, post templates, self-hosting, and the full REST API reference.",
    images: [
      {
        url: "/api/og?title=Posthive%20Documentation&desc=Quick%20start%2C%20platform%20setup%2C%20API%20reference%2C%20and%20self-hosting%20guides.&badge=Docs",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive Documentation",
    description: "Quick start, platform setup, API reference, and self-hosting guides.",
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
