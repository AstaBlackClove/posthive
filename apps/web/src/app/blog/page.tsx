"use client";

import Link from "next/link";


const POSTS = [
  {
    slug: "hootsuite-alternative",
    title: "The Best Hootsuite Alternative in 2026 — Cheaper, Open Source, More Platforms",
    date: "July 7, 2026",
    readTime: "6 min read",
    category: "Comparison",
    excerpt: "Hootsuite costs $99/month minimum. Posthive does the same job across 11 platforms for a fraction of the price — and it's open source.",
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
    title: "Introducing Posthive Schedule posts to 11 platforms at once",
    date: "July 3, 2026",
    readTime: "5 min read",
    category: "Product",
    excerpt:
      "We built Posthive because we were tired of switching between tabs just to post the same update everywhere. Here's what we shipped.",
  },
];

function BlogNav() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: 64, background: "#0a0a0a", borderBottom: "1px solid #1a1a1a",
      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <img src="/posthivemain.png" alt="Posthive" style={{ height: 28 }} />
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Link href="/pricing" style={{ fontSize: 14, color: "#888", textDecoration: "none" }}>Pricing</Link>
        <Link href="/docs" style={{ fontSize: 14, color: "#888", textDecoration: "none" }}>Docs</Link>
        <Link href="/register" style={{
          fontSize: 14, fontWeight: 600, padding: "8px 16px", borderRadius: 8,
          background: "#5b63d3", color: "#fff", textDecoration: "none",
        }}>Get started</Link>
      </div>
    </nav>
  );
}

export default function BlogPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui, sans-serif" }}>
      <BlogNav />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "120px 24px 100px" }}>
        {/* Header */}
        <div style={{ marginBottom: 64 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(91,99,211,.1)", border: "1px solid rgba(91,99,211,.25)",
            borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 700,
            color: "#9ba2ee", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 24,
          }}>
            Blog
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 12px", lineHeight: 1.1 }}>
            Updates &amp; insights
          </h1>
          <p style={{ fontSize: 17, color: "#666", margin: 0 }}>
            Product updates, guides, and creator insights from the Posthive team.
          </p>
        </div>

        {/* Posts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: "none" }}
            >
              <article style={{
                background: "#111", border: "1px solid #1e1e1e", borderRadius: 14,
                padding: "28px 32px", transition: "border-color .15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#333")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e1e1e")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: post.category === "Comparison" ? "#5cb88a" : "#9ba2ee",
                    background: post.category === "Comparison" ? "rgba(80,180,120,.1)" : "rgba(91,99,211,.1)",
                    borderRadius: 6, padding: "3px 9px", letterSpacing: ".04em",
                  }}>
                    {post.category}
                  </span>
                  <span style={{ fontSize: 12, color: "#444" }}>{post.date}</span>
                  <span style={{ fontSize: 12, color: "#444" }}>·</span>
                  <span style={{ fontSize: 12, color: "#444" }}>{post.readTime}</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#ededed", margin: "0 0 10px", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
                  {post.title}
                </h2>
                <p style={{ fontSize: 14, color: "#666", margin: "0 0 20px", lineHeight: 1.7 }}>
                  {post.excerpt}
                </p>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#9ba2ee" }}>
                  Read more →
                </span>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
