import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Posthive. Start free. Upgrade to Creator, Pro, or Team when you're ready.",
  openGraph: {
    title: "Posthive Pricing — Simple, transparent plans",
    description:
      "Start free. Upgrade when you're ready. Creator from ₹550/mo · Pro from ₹1,700/mo · Team from ₹2,600/mo.",
    images: [
      {
        url: "/api/og?layout=pricing&title=Simple%2C%20transparent%20pricing&desc=Start%20free.%20Upgrade%20when%20you%27re%20ready.%20Creator%2C%20Pro%2C%20and%20Team%20plans.&badge=Pricing",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Posthive Pricing — Simple, transparent plans",
    description: "Start free. Creator · Pro · Team.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
