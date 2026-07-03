import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Product updates, guides, and creator insights from the Posthive team.",
  openGraph: {
    title: "Posthive Blog",
    description: "Product updates, guides, and creator insights from the Posthive team.",
    images: [
      {
        url: "/api/og?title=Posthive%20Blog&desc=Product%20updates%2C%20guides%2C%20and%20creator%20insights.&badge=Blog",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
