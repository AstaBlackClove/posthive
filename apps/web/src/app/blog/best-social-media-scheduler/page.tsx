import Link from "next/link";
import type { Metadata } from "next";
import { cn } from "../../../lib/cn";
import { BlogCtaBanner } from "../../../components/BlogCtaBanner";
import { BlogPostHeader } from "../../../components/BlogPostHeader";
import { SiteNav } from "../../../components/SiteNav";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://posthive.co";

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Best Social Media Scheduler 2026 — Free & Paid Picks",
  description: "Honest comparison of the best social media schedulers in 2026. Free plans, pricing, platform support, and who each tool is actually built for.",
  datePublished: "2026-07-07",
  dateModified: "2026-08-01",
  image: `${WEB_URL}/og/landingogimage.jpg`,
  author: { "@type": "Person", name: "Guna", url: "https://x.com/gunaa_dev" },
  publisher: { "@type": "Organization", name: "Posthive", url: WEB_URL },
  url: `${WEB_URL}/blog/best-social-media-scheduler`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the best free social media scheduler?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive offers the most generous free trial (14 days, all features) and is the only major scheduler that is also open source and self-hostable at zero cost. Buffer has a free plan limited to 3 channels and 10 scheduled posts." },
    },
    {
      "@type": "Question",
      name: "What is the cheapest social media scheduler?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive starts at $9 per month with no per-channel pricing and support multiple platforms. Buffer charges per channel, making it more expensive as you add accounts. Self-hosted Posthive is free." },
    },
    {
      "@type": "Question",
      name: "Which social media scheduler supports the most platforms?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive supports multiple platforms: Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube, Facebook, Pinterest, Telegram, Nostr, and X. Most other schedulers do not support Bluesky, Mastodon, Threads, or Telegram." },
    },
    {
      "@type": "Question",
      name: "Is there an open source social media scheduler?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive is open source under AGPL-3.0. You can self-host the entire application on your own server, audit the code, and modify it freely. Most social media schedulers are proprietary SaaS tools." },
    },
    {
      "@type": "Question",
      name: "Can I schedule posts to Bluesky and Mastodon?",
      acceptedAnswer: { "@type": "Answer", text: "Most schedulers do not support Bluesky or Mastodon. Posthive supports both natively. Connect your Bluesky account with an app password and your Mastodon account via OAuth on any instance." },
    },
  ],
};

export const metadata: Metadata = {
  title: "10 Best Social Media Schedulers 2026: Free & Paid Compared",
  description: "Compared: Buffer, Hootsuite, Later, Posthive, and more. Pricing, platform support (Bluesky, Threads, Instagram), free plans, and who each tool is actually built for.",
  keywords: ["best social media scheduler", "best free social media scheduler", "social media scheduler comparison", "cheapest social media scheduler", "top social media scheduling tools"],
  alternates: { canonical: `${WEB_URL}/blog/best-social-media-scheduler` },
  openGraph: {
    title: "10 Best Social Media Schedulers 2026: Free & Paid Compared",
    description: "Compared: Buffer, Hootsuite, Later, Posthive, and more. Pricing, platform support, free plans, and who each tool is actually built for.",
    url: `${WEB_URL}/blog/best-social-media-scheduler`,
    images: [{ url: "/api/og?layout=post&title=Best+Social+Media+Scheduler+2026&desc=Free+and+paid+options+compared&badge=Comparison&date=July+7%2C+2026", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "10 Best Social Media Schedulers 2026: Free & Paid Compared",
    description: "Compared: Buffer, Hootsuite, Later, Posthive, and more. Pricing, platform support, free plans, and who each tool is actually built for.",
  },
};

// Badge tint per tool, same tone per tool across blog posts
const BADGE_TONE: Record<string, string> = {
  Posthive: "bg-green-50 text-green-700",
  Buffer: "bg-blue-50 text-blue-700",
  Hootsuite: "bg-neutral-100 text-neutral-700",
  Later: "bg-red-50 text-red-600",
  Metricool: "bg-brand-100 text-brand-800",
};

function ToolCard({ name, badge, starting, bestFor, platforms, pros, cons }: {
  name: string; badge: string;
  starting: string; bestFor: string; platforms: string; pros: string[]; cons: string[];
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <h3 className="type-body-sb-l text-fg">{name}</h3>
        <span className={cn("rounded-md px-2 py-0.5 type-body-sb-xs", BADGE_TONE[name])}>{badge}</span>
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Starting price", value: starting },
          { label: "Best for", value: bestFor },
          { label: "Platforms", value: platforms },
        ].map((item) => (
          <div key={item.label} className="card bg-bg px-4 py-3">
            <div className="section-label mb-1.5">{item.label}</div>
            <div className="type-body-r-s text-fg">{item.value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="section-label mb-2 text-green-700">Strengths</div>
          {pros.map((p) => (
            <div key={p} className="mb-1.5 flex gap-2 type-body-r-s">
              <span className="shrink-0 text-green-700">+</span>
              <span className="text-muted">{p}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="section-label mb-2 text-red-600">Limitations</div>
          {cons.map((c) => (
            <div key={c} className="mb-1.5 flex gap-2 type-body-r-s">
              <span className="shrink-0 text-red-600">-</span>
              <span className="text-muted">{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BestSocialMediaSchedulerPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SiteNav />

      <div className="mx-auto max-w-170 px-6 pt-14 pb-24">

        <BlogPostHeader
          category="Comparison"
          date="July 7, 2026"
          readTime="10 min read"
          title="The Best Social Media Scheduler in 2026 (Free and Paid)"
        />

        <BlogCtaBanner />

        <div className="article-body">

          <p>
            The social media scheduling market has changed significantly in the past two years. Bluesky has grown to over 30 million users. Threads crossed 300 million. Mastodon and the fediverse are no longer niche. Yet most of the schedulers people recommend were built when Twitter, Instagram, and Facebook were the only platforms that mattered.
          </p>

          <p>
            This guide covers the best social media schedulers in 2026 with honest assessments of pricing, platform support, and which type of creator or team each tool is actually built for. No affiliate links. No paid placements.
          </p>

          <div className="card mb-8 px-5 py-4">
            <p className="mb-2.5 type-body-sb-s text-fg">Tools covered in this guide</p>
            <div className="flex flex-wrap gap-2">
              {["Posthive", "Buffer", "Hootsuite", "Later", "Metricool", "Publer"].map((t) => (
                <span key={t} className="rounded-md bg-neutral-100 px-2.5 py-0.5 type-body-r-xs text-neutral-700">{t}</span>
              ))}
            </div>
          </div>

          <h2>
            What to look for in a social media scheduler
          </h2>

          <p>
            Before comparing tools, it helps to know what actually matters. Here are the criteria we used:
          </p>

          <div className="mb-8 flex flex-col">
            {[
              { label: "Platform coverage", desc: "Does it support the platforms you actually use? Pay close attention to Bluesky, Threads, and Mastodon." },
              { label: "Pricing model", desc: "Per-channel pricing gets expensive fast. Flat pricing is more predictable. Self-hosted options exist." },
              { label: "Scheduling features", desc: "Bulk scheduling, drag-to-reschedule calendars, and first comment support separate basic tools from advanced ones." },
              { label: "Content type support", desc: "Can it schedule Instagram Reels, Stories, carousels, and YouTube Shorts? Not all schedulers go beyond basic posts." },
              { label: "Data ownership", desc: "Your OAuth tokens give these tools access to all your social accounts. Open source and self-hosted options let you keep that data on your own server." },
            ].map((item) => (
              <div key={item.label} className="flex gap-3 border-b border-border py-3">
                <span className="shrink-0 type-body-sb-s text-brand-800">+</span>
                <div>
                  <span className="type-body-sb-s text-fg">{item.label}: </span>
                  <span className="type-body-r-s text-muted">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <h2>
            The best social media schedulers in 2026
          </h2>

          <div className="mb-8 flex flex-col gap-4">
            <ToolCard
              name="Posthive"
              badge="Best for multi-platform"
              starting="$9/month (hosted) or free (self-hosted)"
              bestFor="Indie hackers, creators, developers"
              platforms="Multiple platforms"
              pros={[
                "Supports Bluesky, Threads, Mastodon, Telegram, Nostr",
                "Open source (AGPL-3.0) and fully self-hostable",
                "Flat pricing with no per-channel fees",
                "Bulk CSV scheduling, first comment, drag-to-reschedule calendar",
                "Instagram Reels, Stories, and carousel support",
              ]}
              cons={[
                "No mobile app yet",
                "No built-in analytics dashboard",
                "Smaller team than established players",
              ]}
            />

            <ToolCard
              name="Buffer"
              badge="Best for simplicity"
              starting="Free (3 channels, 10 posts) or $6/channel/month"
              bestFor="Beginners and small teams"
              platforms="7 platforms (no Bluesky, Mastodon, Threads)"
              pros={[
                "Clean, beginner-friendly interface",
                "Free plan available",
                "Good mobile app",
                "Start Page link-in-bio tool included",
              ]}
              cons={[
                "Per-channel pricing adds up with multiple accounts",
                "No Bluesky, Mastodon, Threads, or Telegram support",
                "Limited bulk scheduling on lower plans",
                "No self-hosting option",
              ]}
            />

            <ToolCard
              name="Hootsuite"
              badge="Best for enterprise"
              starting="$99/month (1 user, 10 accounts)"
              bestFor="Large marketing teams"
              platforms="8 platforms (no Bluesky, Mastodon, Threads)"
              pros={[
                "Deep analytics and reporting",
                "Team collaboration and approval workflows",
                "Social listening features",
                "Long-established with large integration ecosystem",
              ]}
              cons={[
                "Very expensive for individuals and small teams",
                "No Bluesky, Mastodon, or Threads support",
                "Cluttered interface",
                "Bulk scheduling locked to higher tiers",
              ]}
            />

            <ToolCard
              name="Later"
              badge="Best for visual planning"
              starting="$16.67/month"
              bestFor="Instagram-first creators"
              platforms="6 platforms (Instagram-focused)"
              pros={[
                "Visual content calendar with drag-and-drop",
                "Strong Instagram Reels and Stories support",
                "Link in bio tool (Linktree-style)",
                "Good media library management",
              ]}
              cons={[
                "Primarily Instagram-focused",
                "No Bluesky, Mastodon, Threads, or Telegram",
                "Higher price point for full feature access",
                "Limited bulk scheduling",
              ]}
            />

            <ToolCard
              name="Metricool"
              badge="Best for analytics"
              starting="Free (limited) or $22/month"
              bestFor="Agencies and data-driven teams"
              platforms="10+ platforms"
              pros={[
                "Strong analytics and competitor analysis",
                "Supports X (Twitter), TikTok, and Google Business",
                "Good value at mid-tier",
                "Auto-publishing with best-time recommendations",
              ]}
              cons={[
                "No Bluesky or Mastodon support",
                "Interface can feel crowded",
                "Higher learning curve than Buffer",
              ]}
            />
          </div>

          <h2>
            Platform support comparison
          </h2>

          <div className="mb-8 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Platform</th>
                  {["Posthive", "Buffer", "Hootsuite", "Later", "Metricool"].map((t) => (
                    <th key={t} className={cn("text-center", t === "Posthive" && "text-brand-800")}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Instagram", true, true, true, true, true],
                  ["Facebook", true, true, true, false, true],
                  ["LinkedIn", true, true, true, false, true],
                  ["X (Twitter)", true, true, true, false, true],
                  ["Pinterest", true, true, false, true, true],
                  ["YouTube", true, true, true, false, true],
                  ["Bluesky", true, false, false, false, false],
                  ["Threads", true, false, false, false, false],
                  ["Mastodon", true, false, false, false, false],
                  ["Telegram", true, false, false, false, false],
                  ["TikTok", false, true, true, true, true],
                ].map(([platform, ...support]) => (
                  <tr key={platform as string}>
                    <td className="text-fg">{platform as string}</td>
                    {(support as boolean[]).map((s, i) => (
                      <td key={i} className={cn("text-center", s ? "text-green-700" : "text-neutral-400")}>
                        {s ? "✓" : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>
            Pricing comparison
          </h2>

          <div className="mb-8 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Entry price</th>
                  <th>Pricing model</th>
                  <th>Free option</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Posthive", "$9/month", "Flat rate", "14-day trial + self-host free"],
                  ["Buffer", "$6/channel/month", "Per channel", "Free (3 channels, 10 posts)"],
                  ["Hootsuite", "$99/month", "Per user + channels", "30-day trial only"],
                  ["Later", "$16.67/month", "Per user", "Free (1 profile per platform)"],
                  ["Metricool", "$22/month", "Per brand", "Free (limited)"],
                ].map(([tool, price, model, free]) => (
                  <tr key={tool as string}>
                    <td className={cn(tool === "Posthive" ? "type-body-sb-s text-brand-800" : "text-fg")}>{tool as string}</td>
                    <td className="text-muted">{price as string}</td>
                    <td className="text-muted">{model as string}</td>
                    <td className="text-muted">{free as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>
            Which scheduler should you choose?
          </h2>

          <div className="mb-8 flex flex-col gap-3">
            {[
              { who: "You post to Bluesky, Mastodon, or Threads", pick: "Posthive", reason: "The only major scheduler that supports all three." },
              { who: "You are just getting started and want simple", pick: "Buffer", reason: "Clean interface, free plan, and easy to learn." },
              { who: "You run a large agency or marketing team", pick: "Hootsuite", reason: "Deep analytics, team workflows, and approval tools." },
              { who: "You are an Instagram-first creator", pick: "Later", reason: "Best visual planning experience for Instagram-heavy workflows." },
              { who: "You care about data ownership", pick: "Posthive (self-hosted)", reason: "Open source, runs on your server, zero vendor lock-in." },
              { who: "You need TikTok scheduling", pick: "Buffer or Metricool", reason: "Posthive does not support TikTok yet. Both Buffer and Metricool do." },
            ].map((item) => (
              <div key={item.who} className="card p-5">
                <p className="mb-1 type-body-r-s text-muted">If...</p>
                <p className="mb-2 type-body-sb-m text-fg">{item.who}</p>
                <p className="mb-1 type-body-sb-s text-brand-800">Pick: {item.pick}</p>
                <p className="type-body-r-s text-muted">{item.reason}</p>
              </div>
            ))}
          </div>

          <p>
            If you are a startup or small business, social scheduling is only one piece of the growth puzzle. Tools like{" "}
            <a href="https://nqz.ai/">NQZ.ai</a>
            {" "}— an AI marketing assistant that handles lead generation, cold email sequences, and SEO research — pair well with a scheduler: you use one to find and reach your audience, and the other to stay consistent once they follow you.
          </p>

          <h2>
            Frequently asked questions
          </h2>

          <div className="mb-8 flex flex-col gap-3">
            {faqSchema.mainEntity.map((item) => (
              <div key={item.name} className="card p-5">
                <p className="mb-2 type-body-sb-m text-fg">{item.name}</p>
                <p className="type-body-r-s text-muted">{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>

          <div className="card mt-12 p-8 text-center">
            <p className="mb-2 type-head-sb-5 text-fg">Try Posthive free for 14 days</p>
            <p className="mb-6 type-body-r-s text-muted">Multi platforms, flat pricing, no credit card required.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-primary px-6 py-3">
                Get started free
              </Link>
              <Link href="/pricing" className="btn-secondary px-6 py-3">
                View pricing
              </Link>
            </div>
          </div>

          {/* Related reading */}
          <div className="mt-12 border-t border-border pt-9">
            <p className="section-label mb-4">Related reading</p>
            <div className="flex flex-col gap-3">
              {[
                { href: "/blog/how-to-schedule-first-comment-instagram", label: "How to schedule your first comment on Instagram (and why it matters)" },
                { href: "/blog/hootsuite-alternative", label: "Hootsuite alternatives: cheaper, open source, more platforms" },
                { href: "/blog/buffer-alternative-open-source", label: "The best open-source Buffer alternative in 2026" },
                { href: "/blog/how-to-schedule-instagram-reels", label: "How to schedule Instagram Reels in 2026 (step-by-step)" },
                { href: "/platforms/bluesky", label: "Schedule Bluesky posts — a platform most schedulers don't support" },
                { href: "/platforms/instagram", label: "Schedule Instagram Reels, Stories, and carousels" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="flex items-center gap-2 type-body-r-s text-brand-800 transition-colors hover:text-brand-900">
                  <span className="text-neutral-400">→</span> {label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      <footer className="border-t border-border px-6 py-10 text-center">
        <div className="mb-4 flex flex-wrap justify-center gap-6">
          {([["Privacy", "/privacy"], ["Terms", "/terms"], ["Docs", "/docs"], ["Pricing", "/pricing"], ["Blog", "/blog"]] as [string, string][]).map(([label, href]) => (
            <Link key={label} href={href} className="type-body-r-s text-muted transition-colors hover:text-fg">{label}</Link>
          ))}
        </div>
        <p className="type-body-r-xs text-muted">© {new Date().getFullYear()} Posthive · AGPL-3.0</p>
      </footer>
    </div>
  );
}
