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
  headline: "The Best Open-Source Social Media Schedulers in 2026",
  description: "Tired of paying $50-100/month for a social media scheduler? Here are the best open-source alternatives you can self-host for free — including Posthive, Postiz, and more.",
  datePublished: "2026-07-17",
  dateModified: "2026-09-24",
  image: `${WEB_URL}/og/landingogimage.jpg`,
  author: { "@type": "Person", name: "Guna", url: "https://x.com/gunaa_dev" },
  publisher: { "@type": "Organization", name: "Posthive", url: WEB_URL },
  url: `${WEB_URL}/blog/open-source-social-media-scheduler`,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Are there free open-source social media schedulers?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive and Postiz are both open source and free to self-host. You only pay for your server infrastructure (typically $5-10/month). Both support multiple social platforms including Instagram, LinkedIn, Bluesky, and Mastodon." },
    },
    {
      "@type": "Question",
      name: "What is the best self-hosted social media scheduler?",
      acceptedAnswer: { "@type": "Answer", text: "Posthive is the best self-hosted social media scheduler in 2026 for most use cases. It covers 14 platforms including fediverse platforms (Bluesky, Mastodon, Pixelfed, Nostr, Lemmy), supports bulk CSV scheduling, first comment scheduling, and MCP agent integration. It runs with one Docker Compose command." },
    },
    {
      "@type": "Question",
      name: "Can I schedule Instagram Reels with an open-source tool?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Posthive supports Instagram Reels, Stories, carousels, and feed posts via the official Instagram Content Publishing API. You need an Instagram Business or Creator account. Self-hosters need to configure their own Meta app credentials." },
    },
    {
      "@type": "Question",
      name: "How hard is it to self-host a social media scheduler?",
      acceptedAnswer: { "@type": "Answer", text: "With Posthive, self-hosting takes about 15 minutes. You need Docker, a Postgres database, and a Redis instance. Copy the .env.example, fill in your API keys, run docker compose up. Full instructions are in the README." },
    },
  ],
};

export const metadata: Metadata = {
  title: "7 Best Open-Source Social Media Schedulers 2026 (Self-Host Free)",
  description: "Skip the $50–$100/month subscriptions. These open-source social media schedulers let you self-host for free — full data ownership, 14+ platforms, no vendor lock-in.",
  keywords: ["open source social media scheduler", "self-hosted social media scheduler", "free social media scheduler open source", "self-hostable social media scheduler", "open source buffer alternative", "open source hootsuite alternative"],
  alternates: { canonical: `${WEB_URL}/blog/open-source-social-media-scheduler` },
  openGraph: {
    title: "7 Best Open-Source Social Media Schedulers 2026 (Self-Host Free)",
    description: "Skip the $50–$100/month subscriptions. Self-host your social media scheduler for free — full data ownership, 14+ platforms, no vendor lock-in.",
    url: `${WEB_URL}/blog/open-source-social-media-scheduler`,
    images: [{ url: "/api/og?layout=post&title=Open-Source+Social+Media+Schedulers&desc=Self-host+for+free+%C2%B7+14+platforms+%C2%B7+AGPL-3.0&badge=Guide&date=July+17%2C+2026", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "7 Best Open-Source Social Media Schedulers 2026 (Self-Host Free)",
    description: "Self-host your social media scheduler for free. No $50/month subscriptions.",
  },
};

// Tag tint per tool, same tone per tool across blog posts
const TAG_TONE: Record<string, string> = {
  Posthive: "bg-green-50 text-green-700",
  Postiz: "bg-blue-50 text-blue-700",
  Mixpost: "bg-brand-100 text-brand-800",
};

export default function OpenSourceSocialMediaSchedulerPage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SiteNav />

      <div className="mx-auto max-w-170 px-6 pt-14 pb-24">

        <BlogPostHeader
          category="Guide"
          date="July 17, 2026"
          readTime="6 min read"
          title="The Best Open-Source Social Media Schedulers in 2026"
        />

        <BlogCtaBanner />

        <div className="article-body">

          <p>
            Buffer starts at $6/month. Hootsuite starts at $99/month. Sprout Social starts at $249/month. For what — scheduling a few posts per week?
          </p>

          <p>
            The open-source alternative exists. You can run a fully capable social media scheduler on your own server for the cost of a VPS — $5-10/month — with no per-seat fees, no vendor lock-in, and full control over your credentials and data.
          </p>

          <p>
            Here are the best open-source social media schedulers in 2026.
          </p>

          <h2>
            Why self-host a social media scheduler?
          </h2>

          <div className="my-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { title: "No subscription fees", desc: "Pay only for your server. $5-10/month vs $50-100/month for a SaaS equivalent." },
              { title: "Your data stays yours", desc: "OAuth tokens and content history live on your infrastructure. No third party holds your social credentials." },
              { title: "Audit the code", desc: "Open source means you can read exactly what the tool does with your accounts. No black boxes." },
              { title: "No platform lock-in", desc: "Fork it, modify it, migrate away at any time. You are never dependent on a vendor's pricing or survival." },
            ].map((item) => (
              <div key={item.title} className="card p-5">
                <p className="mb-2 type-body-sb-m text-fg">{item.title}</p>
                <p className="type-body-r-s text-muted">{item.desc}</p>
              </div>
            ))}
          </div>

          <h2>
            The best open-source social media schedulers in 2026
          </h2>

          <div className="mb-8 flex flex-col gap-4">
            {[
              {
                rank: "01",
                name: "Posthive",
                license: "AGPL-3.0",
                platforms: "14 platforms",
                tag: "Best overall",
                desc: "The most platform-comprehensive open-source scheduler available. Covers Bluesky, Mastodon, Pixelfed, Nostr, Lemmy (the full fediverse stack) alongside mainstream platforms: Instagram, LinkedIn, YouTube, Facebook, Threads, Pinterest, Telegram, Discord, Tumblr. Built with Next.js + Fastify + BullMQ. Ships with Docker Compose for one-command self-hosting. Includes bulk CSV scheduling, first comment scheduling, per-platform content overrides, drag-to-reschedule calendar, and an MCP server for AI agent integration.",
                link: "https://github.com/AstaBlackClove/posthive",
                selfHosted: "Railway, Hetzner, Fly.io, or any VPS",
              },
              {
                rank: "02",
                name: "Postiz",
                license: "AGPL-3.0",
                platforms: "34+ platforms",
                tag: "Feature-rich",
                desc: "Another well-maintained open-source scheduler with a large platform list. Includes an image editor (Polotno), team collaboration, and analytics. Built with NestJS. More complex to self-host than Posthive. Larger codebase, active community. Good choice if you need team features or the built-in design editor.",
                link: "https://github.com/gitroomhq/postiz-app",
                selfHosted: "Docker, Railway",
              },
              {
                rank: "03",
                name: "Mixpost",
                license: "MIT (self-host) / Paid cloud",
                platforms: "Major platforms",
                tag: "Laravel-based",
                desc: "A Laravel/PHP-based social media scheduler. Good choice if your stack is already PHP. Supports Instagram, Facebook, Twitter, LinkedIn, Pinterest, Mastodon. Has a polished UI. Self-host the open-source version or pay for Mixpost Pro.",
                link: "https://github.com/inovector/mixpost",
                selfHosted: "Any PHP/Laravel host",
              },
            ].map((tool) => (
              <div key={tool.name} className="card p-5">
                <div className="mb-3 flex flex-wrap items-start gap-3">
                  <span className="mt-1 type-body-sb-xs text-neutral-400 tabular-nums">{tool.rank}</span>
                  <div className="flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                      <span className="type-body-sb-l text-fg">{tool.name}</span>
                      <span className={cn("rounded-md px-2 py-0.5 type-body-sb-xs", TAG_TONE[tool.name])}>{tool.tag}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 type-body-r-xs text-muted">
                      <span>License: {tool.license}</span>
                      <span>Platforms: {tool.platforms}</span>
                    </div>
                  </div>
                </div>
                <p className="mb-3 type-body-r-s text-muted">{tool.desc}</p>
                <div className="flex gap-2 type-body-r-xs">
                  <a href={tool.link} target="_blank" rel="noopener noreferrer" className="shrink-0 text-brand-800 transition-colors hover:text-brand-900">GitHub →</a>
                  <span className="text-neutral-400">·</span>
                  <span className="text-muted">Self-host on: {tool.selfHosted}</span>
                </div>
              </div>
            ))}
          </div>

          <h2>
            How to self-host Posthive in 15 minutes
          </h2>

          <p>You need: Docker, a Postgres database, and a Redis instance. Then:</p>

          <div className="card mb-8 overflow-x-auto p-5 type-mono-r-s text-brand-800">
            <p className="mb-2 text-muted"># 1. Clone the repo</p>
            <p className="mb-4">git clone https://github.com/AstaBlackClove/posthive</p>
            <p className="mb-2 text-muted"># 2. Copy env and fill in your values</p>
            <p className="mb-4">cp apps/api/.env.example apps/api/.env</p>
            <p className="mb-2 text-muted"># 3. Start everything</p>
            <p>docker compose up -d</p>
          </div>

          <p>
            Full self-host documentation including environment variable reference, platform OAuth setup guides, and Railway/Hetzner deployment guides is in the <Link href="/docs">Posthive docs</Link>.
          </p>

          <h2>
            Open-source vs hosted: which should you choose?
          </h2>

          <div className="mb-8 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th> </th>
                  <th className="text-center">Self-hosted</th>
                  <th className="text-center text-brand-800">Posthive Cloud</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Monthly cost", "$5-10 (server only)", "From $9/mo"],
                  ["Setup time", "~15 minutes", "~2 minutes"],
                  ["Maintenance", "You manage updates", "Managed for you"],
                  ["Data control", "100% yours", "Encrypted, on our servers"],
                  ["OAuth setup", "You register your own Meta/Google apps", "Shared app (limits apply)"],
                  ["Best for", "Developers, privacy-first users, teams", "Non-technical users, fast setup"],
                ].map(([feature, selfHost, cloud]) => (
                  <tr key={feature as string}>
                    <td className="text-fg">{feature as string}</td>
                    <td className="text-center text-muted">{selfHost as string}</td>
                    <td className="text-center text-brand-800">{cloud as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
            <p className="mb-2 type-head-sb-5 text-fg">Try Posthive — self-host or use the cloud</p>
            <p className="mb-6 type-body-r-s text-muted">14-day free trial on cloud. Fully open source. AGPL-3.0.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-primary px-6 py-3">
                Get started free
              </Link>
              <a href="https://github.com/AstaBlackClove/posthive" target="_blank" rel="noopener noreferrer" className="btn-secondary px-6 py-3">
                View on GitHub
              </a>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-9">
            <p className="section-label mb-4">Related reading</p>
            <div className="flex flex-col gap-3">
              {[
                { href: "/blog/how-to-schedule-first-comment-instagram", label: "How to schedule your first comment on Instagram (and why it matters)" },
                { href: "/blog/how-to-schedule-instagram-reels", label: "How to schedule Instagram Reels in 2026 (step-by-step)" },
                { href: "/blog/hootsuite-alternative", label: "5 best Hootsuite alternatives in 2026" },
                { href: "/blog/buffer-alternative-open-source", label: "The best open-source Buffer alternative in 2026" },
                { href: "/features/self-hostable", label: "How Posthive self-hosting works" },
                { href: "/docs", label: "Self-host documentation and setup guide" },
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
