import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { AppShell } from "../components/AppShell";
import { ToastProvider } from "../components/Toast";

const OG_BASE = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

export const metadata: Metadata = {
  title: { default: "Posthive", template: "%s | Posthive" },
  description:
    "Posthive is a social media scheduler for creators and teams. Schedule posts to 7 platforms at once — a modern, open-source alternative to Buffer and Hootsuite.",
  keywords: [
    "social media scheduler",
    "social media scheduling tool",
    "Buffer alternative",
    "Hootsuite alternative",
    "schedule posts",
    "Bluesky scheduler",
    "Instagram Reels scheduler",
    "bulk social media scheduling",
    "multi-platform posting",
    "open source social media tool",
  ],
  icons: { icon: "/posthivemain.png", apple: "/posthivemain.png" },
  metadataBase: new URL(OG_BASE),
  openGraph: {
    type: "website",
    siteName: "Posthive",
    title: "Posthive: Social media scheduling for creators and teams",
    description:
      "The social media scheduling tool built for creators and teams. Write once, publish everywhere.",
    images: [
      {
        url: "/api/og?title=Posthive&desc=The%20social%20media%20scheduling%20tool%20built%20for%20creators%20and%20teams.%20Write%20once%2C%20publish%20everywhere.",
        width: 1200,
        height: 630,
        alt: "Posthive — Social media scheduling",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive — Social media scheduling for creators and teams",
    description:
      "The social media scheduling tool built for creators and teams. Write once, publish everywhere.",
    images: [
      "/api/og?title=Posthive&desc=The%20social%20media%20scheduling%20tool%20built%20for%20creators%20and%20teams.%20Write%20once%2C%20publish%20everywhere.",
    ],
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Posthive",
  url: "https://posthive.co",
  description:
    "Social media scheduler for creators and teams. Schedule posts to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, and Facebook Pages from one place.",
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
      </body>
    </html>
  );
}
