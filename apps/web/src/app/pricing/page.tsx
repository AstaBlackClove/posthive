"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { NavBar } from "../../components/LandingNav";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { cn } from "../../lib/cn";

interface BillingStatus {
  plan: string;
  planStatus: string;
  planName: string;
}

const PLANS = [
  {
    id: "creator",
    name: "Creator",
    desc: "For solo creators finding their rhythm.",
    inr: "₹550",
    usd: "$9",
    popular: false,
    features: [
      { text: "5 connected accounts", included: true },
      { text: "400 posts / month", included: true },
      { text: "All platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Repeat post scheduling", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "1 team member", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "Content Library (1,000 items)", included: true },
      { text: "X/Twitter posting", included: false },
      { text: "API access & MCP", included: false },
      { text: "Webhook outbound", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    desc: "For creators who are serious about growth.",
    inr: "₹1,700",
    usd: "$29",
    popular: true,
    features: [
      { text: "15 connected accounts", included: true },
      { text: "Unlimited posts", included: true },
      { text: "All platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Repeat post scheduling", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "2 team members", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "Content Library (20,000 items)", included: true },
      { text: "X/Twitter posting (100/mo, no links)", included: true },
      { text: "API access & MCP", included: true },
      { text: "Webhook outbound", included: true },
    ],
  },
  {
    id: "team",
    name: "Team",
    desc: "For agencies and fast-moving teams.",
    inr: "₹2,600",
    usd: "$49",
    popular: false,
    features: [
      { text: "50 connected accounts", included: true },
      { text: "Unlimited posts", included: true },
      { text: "All platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Repeat post scheduling", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "4 team members", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "Content Library (100,000 items)", included: true },
      { text: "X/Twitter posting (100/mo, no links)", included: true },
      { text: "API access & MCP", included: true },
      { text: "Webhook outbound", included: true },
    ],
  },
];

const COMPARISON = [
  { feature: "Connected accounts",      trial: "3",       creator: "5",        pro: "15",       team: "50" },
  { feature: "Posts per month",         trial: "30",      creator: "400",      pro: "Unlimited", team: "Unlimited" },
  { feature: "Team members",            trial: "1",       creator: "1",        pro: "2",        team: "4" },
  { feature: "All platforms",           trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Bulk CSV scheduling",     trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Post templates",          trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Repeat post scheduling", trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Calendar view",           trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "First comment",           trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Images per carousel",     trial: "4",       creator: "4",        pro: "10",       team: "10" },
  { feature: "Reels & Stories",         trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Per-platform overrides",  trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Content Library",         trial: "—",       creator: "1,000 items",        pro: "20,000 items",        team: "100,000 items" },
  { feature: "X/Twitter posting",       trial: "—",       creator: "—",        pro: "100/mo",   team: "100/mo" },
  { feature: "API access & MCP",        trial: "—",       creator: "—",        pro: "✓",        team: "✓" },
  { feature: "Webhook outbound",        trial: "—",       creator: "—",        pro: "✓",        team: "✓" },
];

const FAQ = [
  {
    q: "Is there a free trial?",
    a: "Yes. Every new account starts with a 14-day trial with access to 3 accounts and 30 posts.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrade or downgrade whenever you like. Upgrades take effect immediately; downgrades apply at the end of the billing period.",
  },
  {
    q: "What platforms are supported?",
    a: "Bluesky, Threads, Instagram (Posts, Reels, Stories), LinkedIn, Mastodon, YouTube (Shorts & video), and Facebook Pages and more. All plans include all platforms.",
  },
  {
    q: "Can I self-host Posthive?",
    a: "Yes. Posthive is open-source (AGPL-3.0). You can run your own instance billing is disabled by default for self-hosted deployments.",
  },
  {
    q: "What is the API & MCP used for?",
    a: "The Posthive REST API and MCP server let you schedule posts programmatically from AI agents (Claude, Cursor), automation scripts, or custom integrations. Connect Claude.ai directly as a custom connector — no install needed. Available on Pro and Team plans.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We use Dodo Payments. Cards, UPI (India), and other local payment methods are supported depending on your region.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function PricingPage() {
  const { user } = useAuth();
  const ctaHref = user ? "/compose" : "/register";
  const navCtaLabel = user ? "Go to scheduler" : "Get started free";
  const [isIndia, setIsIndia] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") setIsIndia(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user) { setBillingStatus(null); return; }
    apiFetch<BillingStatus>("/billing/status").then(setBillingStatus).catch(() => {});
  }, [user]);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <NavBar user={!!user} ctaHref={ctaHref} navCtaLabel={navCtaLabel} />

      <div className="mx-auto max-w-6xl px-5 pt-30 pb-24 md:px-12">

        {/* Hero */}
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-100 px-4 py-1.5 type-body-sb-xs uppercase tracking-wider text-brand-800">
            Pricing
          </div>
          <h1 className="mb-4 type-display-m-6 tracking-tight md:type-display-m-4">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mb-8 max-w-130 type-body-r-l text-muted">
            Start free. Upgrade when you&apos;re ready. No hidden fees, no per-seat nonsense.
          </p>

          {/* Currency toggle */}
          <div className="inline-flex gap-0.5 rounded-xl border border-border bg-surface p-1">
            {[{ label: "INR ₹", val: true }, { label: "USD $", val: false }].map(({ label, val }) => (
              <button
                key={label}
                onClick={() => setIsIndia(val)}
                className={cn(
                  "cursor-pointer rounded-md px-5 py-2 type-body-sb-s transition-all duration-150",
                  isIndia === val ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="mb-20 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = billingStatus?.planStatus === "active" && billingStatus?.plan === plan.id;
            return (
            <div
              key={plan.id}
              className={cn(
                "card relative flex flex-col px-7 py-8",
                isCurrent ? "border-brand-300 bg-brand-100" : plan.popular && "border-brand-300",
              )}
            >
              {isCurrent ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-bg px-3.5 py-1 type-body-sb-xs uppercase tracking-wider text-muted">
                  Current plan
                </div>
              ) : plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3.5 py-1 type-body-sb-xs uppercase tracking-wider text-accent-fg">
                  Most popular
                </div>
              )}

              <div className="mb-6">
                <div className="mb-1.5 type-body-sb-l text-fg">{plan.name}</div>
                <div className="type-body-r-s text-muted">{plan.desc}</div>
              </div>

              <div className="mb-7">
                <span className="type-head-sb-1 tracking-tight text-fg">
                  {isIndia ? plan.inr : plan.usd}
                </span>
                <span className="ml-1.5 type-body-r-s text-muted">
                  /mo · {isIndia ? `≈ ${plan.usd}` : `≈ ${plan.inr}`}
                </span>
              </div>

              <Link
                href={isCurrent ? "/billing" : user ? "/billing" : "/register"}
                className={cn(
                  "mb-7 w-full py-2.5",
                  isCurrent ? "btn-secondary bg-bg text-muted" : "btn-primary",
                )}
              >
                {isCurrent ? "Current plan" : user ? "Manage plan" : "Get started"}
              </Link>

              <div className="flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <div key={f.text} className="flex items-center gap-2.5">
                    <span className={cn("shrink-0 type-body-r-s", f.included ? "text-green-700" : "text-neutral-400")}>
                      {f.included ? "✓" : "—"}
                    </span>
                    <span className={cn("type-body-r-s", f.included ? "text-fg" : "text-muted")}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
            );
          })}
        </div>

        {/* Trial callout */}
        <div className="mb-20 flex flex-wrap items-center justify-center gap-5 rounded-2xl border border-brand-300 bg-brand-100 px-6 py-6 text-center md:px-8">
          <div>
            <div className="mb-1 type-body-sb-m text-fg">Not sure yet?</div>
            <div className="type-body-r-s text-muted">Start with a 14-day free trial. 3 accounts, 30 posts.</div>
          </div>
          <Link href="/register" className="btn-primary whitespace-nowrap px-6 py-2.5">
            Start free trial
          </Link>
        </div>

        {/* Comparison table */}
        <div className="mb-20">
          <h2 className="mb-8 text-center type-head-sb-5 tracking-tight text-fg md:type-head-sb-4">
            Compare plans
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 border-collapse type-body-r-s">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left type-body-sb-s text-muted">Feature</th>
                  {["Trial", "Creator", "Pro", "Team"].map(h => (
                    <th key={h} className={cn(
                      "px-4 py-3 text-center type-body-sb-s",
                      h === "Pro" ? "text-brand-800" : "text-muted",
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={cn("border-b border-border", i % 2 !== 0 && "bg-surface/50")}>
                    <td className="px-4 py-2.5 text-muted">{row.feature}</td>
                    {[row.trial, row.creator, row.pro, row.team].map((val, j) => (
                      <td key={j} className={cn(
                        "px-4 py-2.5 text-center",
                        val === "✓" || val === "—" ? "type-body-sb-s" : "type-body-r-s",
                        val === "✓" ? "text-green-700" : val === "—" ? "text-neutral-400" : j === 2 ? "text-brand-800" : "text-muted",
                      )}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mb-20 max-w-170">
          <h2 className="mb-8 text-center type-head-sb-5 tracking-tight text-fg md:type-head-sb-4">
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-0.5">
            {FAQ.map((item, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="type-body-sb-s text-fg">{item.q}</span>
                  <span className={cn(
                    "shrink-0 type-body-r-m text-muted transition-transform duration-150",
                    openFaq === i && "rotate-45",
                  )}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 type-body-r-s text-muted">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="mb-4 type-body-r-s text-muted">
            Open-source · Self-hostable · AGPL-3.0
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary px-7 py-3 type-body-sb-m">
              Start free trial
            </Link>
            <Link href="/docs" className="btn-secondary px-7 py-3 type-body-sb-m">
              Read the docs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
