import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { AppShell } from "../components/AppShell";
import { ToastProvider } from "../components/Toast";

const OG_BASE = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.in";

export const metadata: Metadata = {
  title: { default: "Posthive", template: "%s | Posthive" },
  description:
    "Schedule posts to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, and Facebook Pages — all from one clean interface.",
  icons: { icon: "/posthivemain.png", apple: "/posthivemain.png" },
  metadataBase: new URL(OG_BASE),
  openGraph: {
    type: "website",
    siteName: "Posthive",
    title: "Posthive — Schedule posts to 7 platforms at once",
    description:
      "Schedule posts to Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, and Facebook Pages — all from one clean interface.",
    images: [
      {
        url: "/api/og?title=Posthive%20%E2%80%94%20Schedule%20posts%20to%207%20platforms&desc=Write%20once%2C%20publish%20everywhere.%20Bluesky%2C%20Threads%2C%20Instagram%2C%20LinkedIn%2C%20Mastodon%2C%20YouTube%20%26%20Facebook.",
        width: 1200,
        height: 630,
        alt: "Posthive — Social media scheduling",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive — Schedule posts to 7 platforms at once",
    description:
      "Write once, publish everywhere. Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube & Facebook.",
    images: [
      "/api/og?title=Posthive%20%E2%80%94%20Schedule%20posts%20to%207%20platforms&desc=Write%20once%2C%20publish%20everywhere.%20Bluesky%2C%20Threads%2C%20Instagram%2C%20LinkedIn%2C%20Mastodon%2C%20YouTube%20%26%20Facebook.",
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" style={{ backgroundColor: "var(--color-bg)" }}>
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
