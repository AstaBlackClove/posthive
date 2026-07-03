import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { AppShell } from "../components/AppShell";
import { ToastProvider } from "../components/Toast";

const OG_BASE = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.in";

export const metadata: Metadata = {
  title: { default: "Posthive", template: "%s | Posthive" },
  description:
    "The social media scheduling tool built for creators and teams. Write once, publish everywhere.",
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
