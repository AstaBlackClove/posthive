import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Posthive — a Buffer and Hootsuite alternative. Start free for 14 days. Upgrade to Creator ($9), Pro ($29), or Team ($49).",
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

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is there a free trial?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Every new account starts with a 14-day trial with access to 3 accounts and 30 posts." },
    },
    {
      "@type": "Question",
      name: "Can I switch plans at any time?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Upgrade or downgrade whenever you like. Upgrades take effect immediately; downgrades apply at the end of the billing period." },
    },
    {
      "@type": "Question",
      name: "What platforms are supported?",
      acceptedAnswer: { "@type": "Answer", text: "Bluesky, Threads, Instagram (Posts, Reels, Stories), LinkedIn, Mastodon, YouTube (Shorts & video), and Facebook Pages and more. All plans include all platforms." },
    },
    {
      "@type": "Question",
      name: "Can I self-host Posthive?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive is open-source (AGPL-3.0). You can run your own instance billing is disabled by default for self-hosted deployments." },
    },
    {
      "@type": "Question",
      name: "What payment methods are accepted?",
      acceptedAnswer: { "@type": "Answer", text: "We use Dodo Payments. Cards, UPI (India), and other local payment methods are supported depending on your region." },
    },
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
