import type { Metadata } from "next";

const docsSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  name: "Posthive Documentation",
  description:
    "Complete documentation for Posthive — the open-source social media scheduler. Learn how to self-host, connect platforms, use the REST API, and integrate with Claude via MCP.",
  url: "https://posthive.co/docs",
  publisher: {
    "@type": "Organization",
    name: "Posthive",
    url: "https://posthive.co",
  },
  about: [
    { "@type": "SoftwareApplication", name: "Posthive" },
    { "@type": "Thing", name: "Social media scheduling" },
    { "@type": "Thing", name: "MCP server" },
    { "@type": "Thing", name: "Self-hosted social scheduler" },
  ],
};

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Complete documentation for Posthive. Self-host with Docker, connect Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook, Pinterest, Telegram, and Nostr. REST API and MCP server reference included.",
  openGraph: {
    title: "Posthive Docs — Setup, Platforms & API Reference",
    description:
      "Self-host guide, platform setup, REST API, and MCP server reference for Posthive.",
    url: "https://posthive.co/docs",
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive Docs — Setup, Platforms & API Reference",
    description:
      "Self-host guide, platform setup, REST API, and MCP server reference for Posthive.",
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(docsSchema) }}
      />
      {children}
    </>
  );
}
