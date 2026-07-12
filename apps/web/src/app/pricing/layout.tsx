import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Posthive. Start free with a 14-day trial. Creator from $9/mo, Pro from $29/mo, Team from $49/mo. No hidden fees, no per-seat nonsense.",
  openGraph: {
    title: "Posthive Pricing — Simple & Transparent",
    description:
      "Start free. Upgrade when you're ready. Creator $9, Pro $29, Team $49. All plans include all 13 platforms.",
    url: "https://posthive.co/pricing",
    images: [
      {
        url: "/og/pricingogimage.png",
        width: 1200,
        height: 630,
        alt: "Posthive Pricing — Simple & Transparent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive Pricing — Simple & Transparent",
    description:
      "Start free. Upgrade when you're ready. Creator $9, Pro $29, Team $49. All plans include all 13 platforms.",
    images: ["/og/pricingogimage.png"],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
