import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "../context/AuthContext";
import { AppShell } from "../components/AppShell";
import { ToastProvider } from "../components/Toast";

const OG_BASE = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

export const metadata: Metadata = {
  title: { default: "Posthive — Open-source Social Media Scheduler", template: "%s | Posthive" },
  description: "Open-source social media scheduler for Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube & more. Write once, post to 11 platforms. Self-hostable.",
  keywords: [
    "open source social media scheduler",
    "Bluesky scheduler",
    "Threads scheduler",
    "Mastodon scheduler",
    "schedule first comment",
    "first comment automation",
    "social media scheduling tool",
    "Buffer alternative",
    "Hootsuite alternative",
    "schedule posts",
    "Instagram Reels scheduler",
    "bulk social media scheduling",
    "multi-platform posting",
    "self-hosted social media scheduler",
  ],
  icons: { icon: "/posthivemain.png", apple: "/posthivemain.png" },
  metadataBase: new URL(OG_BASE),
  openGraph: {
    type: "website",
    siteName: "Posthive",
    title: "Posthive — Open-source Social Media Scheduler",
    description:
      "Schedule posts and first comments on Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook, Pinterest, Telegram & Nostr. Flat price. Self-host if you want.",
    images: [
      {
        url: "/og/landingogimage.png",
        width: 1200,
        height: 630,
        alt: "Posthive — Open-source social media scheduler for 11 platforms",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive — Open-source Social Media Scheduler",
    description:
      "Schedule posts and first comments on Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook, Pinterest, Telegram & Nostr. Flat price. Self-host if you want.",
    images: ["/og/landingogimage.png"],
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Posthive",
  url: "https://posthive.co",
  description:
    "The open-source social media scheduler for Bluesky, Threads, Mastodon, LinkedIn, Instagram, YouTube, and Facebook. Schedule posts and first comments from one place.",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: [
    { "@type": "Offer", name: "Creator", price: "9",  priceCurrency: "USD", description: "5 accounts, 400 posts/month" },
    { "@type": "Offer", name: "Pro",     price: "29", priceCurrency: "USD", description: "15 accounts, unlimited posts" },
    { "@type": "Offer", name: "Team",    price: "49", priceCurrency: "USD", description: "50 accounts, unlimited posts" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" style={{ backgroundColor: "var(--color-bg)" }}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body className="h-full font-sans antialiased">
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
        <Analytics />
        <Script id="posthive-console" strategy="afterInteractive">{`
          console.log('%c Posthive ','background:#5b63d3;color:#fff;font-size:16px;font-weight:700;padding:6px 14px;border-radius:6px;font-family:sans-serif;');
          console.log('%cHey! Posthive is open source (AGPL-3.0).','font-size:13px;color:#ededed;');
          console.log('%c⭐ Star us → https://github.com/AstaBlackClove/posthive','font-size:12px;color:#888;');
        `}</Script>
      </body>
    </html>
  );
}
