import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Product updates, creator guides, and insights from the Posthive team. Learn how to schedule smarter across Bluesky, Threads, Instagram, LinkedIn, and more.",
  openGraph: {
    title: "Posthive Blog — Updates & Insights",
    description:
      "Product updates, creator guides, and insights from the Posthive team.",
    url: "https://posthive.co/blog",
    images: [
      {
        url: "/og/blogogimage.png",
        width: 1200,
        height: 630,
        alt: "Posthive Blog — Updates & Insights",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive Blog — Updates & Insights",
    description:
      "Product updates, creator guides, and insights from the Posthive team.",
    images: ["/og/blogogimage.png"],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
