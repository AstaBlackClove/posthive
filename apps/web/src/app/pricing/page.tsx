"use client";

import Link from "next/link";
import { useState } from "react";
import { NavBar } from "../../components/LandingNav";
import { useAuth } from "../../context/AuthContext";

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
      { text: "All 7 platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "Reels & Stories", included: false },
      { text: "Per-platform overrides", included: false },
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
      { text: "All 7 platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "X/Twitter posting (100/mo, no links)", included: true },
      { text: "API access & MCP (3 keys)", included: true },
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
      { text: "All 7 platforms", included: true },
      { text: "Bulk CSV scheduling", included: true },
      { text: "Post templates", included: true },
      { text: "Calendar & drag-reschedule", included: true },
      { text: "First comment automation", included: true },
      { text: "Reels & Stories", included: true },
      { text: "Per-platform overrides", included: true },
      { text: "X/Twitter posting (100/mo, no links)", included: true },
      { text: "API access & MCP (10 keys)", included: true },
      { text: "Webhook outbound", included: true },
    ],
  },
];

const COMPARISON = [
  { feature: "Connected accounts",      trial: "3",       creator: "5",        pro: "15",       team: "50" },
  { feature: "Posts per month",         trial: "30",      creator: "400",      pro: "Unlimited", team: "Unlimited" },
  { feature: "All 7 platforms",         trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Bulk CSV scheduling",     trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Post templates",          trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Calendar view",           trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "First comment",           trial: "✓",       creator: "✓",        pro: "✓",        team: "✓" },
  { feature: "Images per carousel",     trial: "4",       creator: "4",        pro: "10",       team: "10" },
  { feature: "Reels & Stories",         trial: "—",       creator: "—",        pro: "✓",        team: "✓" },
  { feature: "Per-platform overrides",  trial: "—",       creator: "—",        pro: "✓",        team: "✓" },
  { feature: "X/Twitter posting",       trial: "—",       creator: "—",        pro: "100/mo",   team: "100/mo" },
  { feature: "API access & MCP",        trial: "—",       creator: "—",        pro: "3 keys",   team: "10 keys" },
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

export default function PricingPage() {
  const { user } = useAuth();
  const ctaHref = user ? "/compose" : "/register";
  const navCtaLabel = user ? "Go to scheduler" : "Get started free";
  const [isIndia, setIsIndia] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui, sans-serif" }}>
      <NavBar user={!!user} ctaHref={ctaHref} navCtaLabel={navCtaLabel} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 24px 100px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(91,99,211,.1)", border: "1px solid rgba(91,99,211,.25)",
            borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 700,
            color: "#9ba2ee", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 24,
          }}>
            Pricing
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.1 }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: 18, color: "#666", margin: "0 0 32px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            Start free. Upgrade when you&apos;re ready. No hidden fees, no per-seat nonsense.
          </p>

          {/* Currency toggle */}
          <div style={{ display: "inline-flex", background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 4, gap: 2 }}>
            {[{ label: "INR ₹", val: true }, { label: "USD $", val: false }].map(({ label, val }) => (
              <button
                key={label}
                onClick={() => setIsIndia(val)}
                style={{
                  padding: "7px 20px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "none", transition: "all .15s",
                  background: isIndia === val ? "#fff" : "transparent",
                  color: isIndia === val ? "#0a0a0a" : "#666",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 80 }}
          className="pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: plan.popular ? "#0e0e1a" : "#111",
                border: `1px solid ${plan.popular ? "#3730a3" : "#2a2a2a"}`,
                borderRadius: 16,
                padding: "32px 28px",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {plan.popular && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "#5b63d3", color: "#fff", fontSize: 11, fontWeight: 700,
                  padding: "4px 14px", borderRadius: 20, letterSpacing: ".06em", textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}>
                  Most popular
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#ededed", marginBottom: 6 }}>{plan.name}</div>
                <div style={{ fontSize: 13, color: "#666" }}>{plan.desc}</div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: "#ededed", letterSpacing: "-0.03em" }}>
                  {isIndia ? plan.inr : plan.usd}
                </span>
                <span style={{ fontSize: 14, color: "#555", marginLeft: 6 }}>
                  /mo · {isIndia ? `≈ ${plan.usd}` : `≈ ${plan.inr}`}
                </span>
              </div>

              <Link
                href="/register"
                style={{
                  display: "block", textAlign: "center", padding: "11px 0", borderRadius: 10,
                  fontSize: 14, fontWeight: 700, textDecoration: "none", marginBottom: 28,
                  background: plan.popular ? "#5b63d3" : "#fff",
                  color: plan.popular ? "#fff" : "#0a0a0a",
                  transition: "opacity .15s",
                }}
              >
                Get started
              </Link>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {plan.features.map((f) => (
                  <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, color: f.included ? "#4ade80" : "#333", flexShrink: 0 }}>
                      {f.included ? "✓" : "—"}
                    </span>
                    <span style={{ fontSize: 13.5, color: f.included ? "#b4b4b4" : "#444" }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trial callout */}
        <div style={{
          background: "rgba(91,99,211,.06)", border: "1px solid rgba(91,99,211,.2)",
          borderRadius: 14, padding: "24px 32px", textAlign: "center", marginBottom: 80,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#ededed", marginBottom: 4 }}>Not sure yet?</div>
            <div style={{ fontSize: 14, color: "#666" }}>Start with a 14-day free trial. 3 accounts, 30 posts.</div>
          </div>
          <Link href="/register" style={{
            background: "#fff", color: "#0a0a0a", padding: "10px 24px",
            borderRadius: 9, fontSize: 14, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Start free trial
          </Link>
        </div>

        {/* Comparison table */}
        <div style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "#ededed", letterSpacing: "-0.02em", marginBottom: 32, textAlign: "center" }}>
            Compare plans
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", color: "#555", fontWeight: 600 }}>Feature</th>
                  {["Trial", "Creator", "Pro", "Team"].map(h => (
                    <th key={h} style={{
                      textAlign: "center", padding: "12px 16px", color: h === "Pro" ? "#9ba2ee" : "#555",
                      fontWeight: 700,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid #1a1a1a", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.01)" }}>
                    <td style={{ padding: "11px 16px", color: "#888" }}>{row.feature}</td>
                    {[row.trial, row.creator, row.pro, row.team].map((val, j) => (
                      <td key={j} style={{
                        padding: "11px 16px", textAlign: "center",
                        color: val === "✓" ? "#4ade80" : val === "—" ? "#333" : j === 2 ? "#c4c9ff" : "#aaa",
                        fontWeight: val === "✓" || val === "—" ? 700 : 400,
                      }}>
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
        <div style={{ maxWidth: 680, margin: "0 auto 80px" }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "#ededed", letterSpacing: "-0.02em", marginBottom: 32, textAlign: "center" }}>
            Frequently asked questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{ border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between",
                    alignItems: "center", gap: 12,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>{item.q}</span>
                  <span style={{ color: "#555", fontSize: 16, flexShrink: 0, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform .15s" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 16px", fontSize: 14, color: "#666", lineHeight: 1.7 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#444", marginBottom: 16 }}>
            Open-source · Self-hostable · AGPL-3.0
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" style={{
              background: "#fff", color: "#0a0a0a", padding: "12px 28px",
              borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: "none",
            }}>
              Start free trial
            </Link>
            <Link href="/docs" style={{
              background: "transparent", color: "#888", padding: "12px 28px",
              borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: "none",
              border: "1px solid #2a2a2a",
            }}>
              Read the docs
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
