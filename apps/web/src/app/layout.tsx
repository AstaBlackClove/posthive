import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { AppShell } from "../components/AppShell";
import { ToastProvider } from "../components/Toast";

export const metadata: Metadata = {
  title: "Posthive",
  description: "Schedule posts to Bluesky, Threads, and Instagram from one place.",
  icons: { icon: "/posthivemain.png", apple: "/posthivemain.png" },
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
