import Link from "next/link";
import { BlogCategoryBadge } from "../../components/BlogPostHeader";
import { SiteNav } from "../../components/SiteNav";

const POSTS = [
  {
    slug: "open-source-social-media-scheduler",
    title: "The Best Open-Source Social Media Schedulers in 2026",
    date: "July 17, 2026",
    readTime: "6 min read",
    category: "Guide",
    excerpt: "Tired of paying $50-100/month for Buffer or Hootsuite? Here are the best open-source schedulers you can self-host for free — including Posthive, Postiz, and Mixpost.",
  },
  {
    slug: "how-to-schedule-first-comment-instagram",
    title: "How to Schedule a First Comment on Instagram (and Why You Should)",
    date: "July 17, 2026",
    readTime: "5 min read",
    category: "Guide",
    excerpt: "Automatically post a first comment on Instagram right after your post goes live. Add hashtags, CTAs, or links without cluttering your caption.",
  },
  {
    slug: "storrito-alternative",
    title: "The Best Storrito Alternative in 2026 — More Platforms, Lower Price",
    date: "July 17, 2026",
    readTime: "5 min read",
    category: "Comparison",
    excerpt: "Storrito focuses on Instagram only. Posthive schedules Instagram Stories, Reels, and carousels — plus 13 other platforms. Open source and self-hostable.",
  },
  {
    slug: "best-social-media-scheduler",
    title: "The Best Social Media Scheduler in 2026 (Free and Paid)",
    date: "July 7, 2026",
    readTime: "10 min read",
    category: "Comparison",
    excerpt: "A no-fluff comparison of the best social media schedulers in 2026. Pricing, platform support, and who each tool is actually built for.",
  },
  {
    slug: "how-to-schedule-instagram-reels",
    title: "How to Schedule Instagram Reels in 2026 (Step-by-Step Guide)",
    date: "July 7, 2026",
    readTime: "8 min read",
    category: "Guide",
    excerpt: "Learn how to schedule Instagram Reels in advance using Posthive. Save hours every week by batching your content and publishing automatically at peak times.",
  },
  {
    slug: "canva-social-media-scheduler-alternative",
    title: "The Best Canva Social Media Scheduler Alternative in 2026",
    date: "July 7, 2026",
    readTime: "7 min read",
    category: "Comparison",
    excerpt: "Canva scheduler is limited to 8 platforms and locked behind Pro. Here is a better alternative that covers multiple platforms including Bluesky, Threads, and Mastodon.",
  },
  {
    slug: "hootsuite-alternative",
    title: "The Best Hootsuite Alternative in 2026 — Cheaper, Open Source, More Platforms",
    date: "July 7, 2026",
    readTime: "6 min read",
    category: "Comparison",
    excerpt: "Hootsuite costs $99/month minimum. Posthive does the same job across multi platforms for a fraction of the price — and it's open source.",
  },
  {
    slug: "buffer-alternative-open-source",
    title: "The Best Open-Source Buffer Alternative in 2026",
    date: "July 7, 2026",
    readTime: "7 min read",
    category: "Comparison",
    excerpt: "Looking for a Buffer alternative that's open source, self-hostable, and supports more platforms? Posthive does everything Buffer does and more for less.",
  },
  {
    slug: "introducing-posthive",
    title: "Introducing Posthive Schedule posts to multi platforms at once",
    date: "July 3, 2026",
    readTime: "5 min read",
    category: "Product",
    excerpt:
      "We built Posthive because we were tired of switching between tabs just to post the same update everywhere. Here's what we shipped.",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      <SiteNav />

      <div className="mx-auto max-w-3xl px-6 pt-14 pb-24">
        {/* Header */}
        <div className="mb-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-100 px-4 py-1.5 type-body-sb-xs uppercase tracking-wider text-brand-800">
            Blog
          </div>
          <h1 className="mb-3 type-head-sb-2 tracking-tight text-fg sm:type-head-sb-1">
            Updates &amp; insights
          </h1>
          <p className="type-body-r-l text-muted">
            Product updates, guides, and creator insights from the Posthive team.
          </p>
        </div>

        {/* Posts */}
        <div className="flex flex-col gap-4">
          {POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
              <article className="card p-6 transition-colors hover:border-neutral-300">
                <div className="mb-3.5 flex flex-wrap items-center gap-2.5 type-body-r-xs text-muted">
                  <BlogCategoryBadge category={post.category} />
                  <span>{post.date}</span>
                  <span>·</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="mb-2.5 type-head-sb-6 tracking-tight text-fg">
                  {post.title}
                </h2>
                <p className="mb-5 type-body-r-s text-muted">
                  {post.excerpt}
                </p>
                <span className="type-body-sb-s text-brand-800">
                  Read more
                </span>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
