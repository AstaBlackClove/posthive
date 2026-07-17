import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const PLATFORMS = [
  { name: "Bluesky",   color: "#0085ff" },
  { name: "Threads",   color: "#e6e6e6" },
  { name: "Instagram", color: "#e1306c" },
  { name: "LinkedIn",  color: "#0a66c2" },
  { name: "Mastodon",  color: "#6364ff" },
  { name: "YouTube",   color: "#ff0000" },
  { name: "Facebook",  color: "#1877f2" },
];

// ── Shared primitives ────────────────────────────────────────────────────────

function Grid() {
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex",
      backgroundImage: "linear-gradient(rgba(91,99,211,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(91,99,211,0.07) 1px, transparent 1px)",
      backgroundSize: "56px 56px",
    }} />
  );
}

function Glow(_props: { top?: number; left?: number; size?: number; opacity?: number }) {
  return null;
}

function TopBar() {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 3, display: "flex",
      background: "linear-gradient(90deg, #5b63d3 0%, #818cf8 60%, transparent 100%)",
    }} />
  );
}

function Logo({ src, size = 48 }: { src: string; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <img src={src} alt="" width={size} height={size} style={{ borderRadius: 11, display: "flex" }} />
      <span style={{ fontSize: 22, fontWeight: 700, color: "#ededed", letterSpacing: "-0.01em" }}>Posthive</span>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <div style={{
      display: "flex", background: "rgba(91,99,211,0.18)",
      border: "1px solid rgba(91,99,211,0.4)", borderRadius: 20,
      padding: "7px 20px", fontSize: 13, fontWeight: 700,
      color: "#9ba2ee", letterSpacing: "0.1em", textTransform: "uppercase",
    }}>
      {text}
    </div>
  );
}

// ── Layout: home (default) ───────────────────────────────────────────────────

function HomeLayout({ logo, title, desc }: { logo: string; title: string; desc: string }) {
  const fontSize = title.length > 40 ? 72 : title.length > 28 ? 84 : 96;
  return (
    <div style={{ width: 1200, height: 630, background: "#0a0a0a", display: "flex", position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      <Grid />
      <Glow top={-200} left={-100} size={700} opacity={0.22} />
      <Glow top={350} left={700} size={500} opacity={0.1} />

      <div style={{ display: "flex", flexDirection: "column", padding: "64px 80px", flex: 1, justifyContent: "space-between" }}>

        {/* Top — logo + brand label */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo src={logo} />
          <div style={{ width: 1, height: 24, background: "#2a2a2a", display: "flex" }} />
          <span style={{ fontSize: 15, color: "#5b63d3", fontWeight: 600, letterSpacing: "0.02em" }}>Social media scheduling</span>
        </div>

        {/* Middle — headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize, fontWeight: 800, color: "#ffffff", lineHeight: 1.05, letterSpacing: "-0.04em", display: "flex", flexWrap: "wrap", maxWidth: 1040 }}>
            {title}
          </div>
          <div style={{ fontSize: 26, color: "#555", display: "flex", maxWidth: 800 }}>{desc}</div>
        </div>

        {/* Bottom — platform pills + domain */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {PLATFORMS.map((p) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "7px 13px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "flex", boxShadow: `0 0 7px ${p.color}` }} />
                <span style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>{p.name}</span>
              </div>
            ))}
          </div>
          <span style={{ fontSize: 15, color: "#333", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>POSTHIVE.CO</span>
        </div>

      </div>
    </div>
  );
}

// ── Layout: pricing ──────────────────────────────────────────────────────────

function PricingLayout({ logo, title, desc }: { logo: string; title: string; desc: string }) {
  const plans = [
    { name: "Creator", price: "$9",  sub: "/mo", popular: false },
    { name: "Pro",     price: "$29", sub: "/mo", popular: true  },
    { name: "Team",    price: "$49", sub: "/mo", popular: false },
  ];
  return (
    <div style={{ width: 1200, height: 630, background: "#0a0a0a", display: "flex", position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      <Grid />
      <Glow top={-100} left={-100} size={500} opacity={0.2} />
      <Glow top={200} left={800} size={400} opacity={0.14} />
      <TopBar />

      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 72px", width: 520, gap: 20 }}>
        <Logo src={logo} />
        <Badge text="Pricing" />
        <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.03em", display: "flex", flexWrap: "wrap" }}>{title}</div>
        <div style={{ fontSize: 18, color: "#666", lineHeight: 1.5, display: "flex" }}>{desc}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "flex" }} />
          <span style={{ fontSize: 13, color: "#4ade80" }}>14-day free trial</span>
        </div>
      </div>

      {/* Right — plan cards */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flex: 1, padding: "60px 60px 60px 20px" }}>
        {plans.map((p) => (
          <div key={p.name} style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            background: p.popular ? "rgba(91,99,211,0.12)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${p.popular ? "rgba(91,99,211,0.5)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 16, padding: "28px 24px", width: 178, gap: 10,
            position: "relative",
          }}>
            {p.popular && (
              <div style={{ position: "absolute", top: -12, display: "flex", background: "#5b63d3", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 20, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Popular
              </div>
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: p.popular ? "#c4c9ff" : "#aaa" }}>{p.name}</span>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{p.price}</span>
            <span style={{ fontSize: 12, color: "#555" }}>{p.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Layout: docs ─────────────────────────────────────────────────────────────

function DocsLayout({ logo, title, desc }: { logo: string; title: string; desc: string }) {
  const sections = [
    { label: "Quick start",        color: "#4ade80" },
    { label: "Platform setup",     color: "#60a5fa" },
    { label: "Bulk CSV",           color: "#f472b6" },
    { label: "Post templates",     color: "#fb923c" },
    { label: "Self-hosting",       color: "#a78bfa" },
    { label: "API reference",      color: "#34d399" },
  ];
  return (
    <div style={{ width: 1200, height: 630, background: "#0a0a0a", display: "flex", position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      <Grid />
      <Glow top={-80} left={300} size={600} opacity={0.18} />
      <TopBar />

      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 580 }}>
        <Logo src={logo} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Badge text="Documentation" />
          <div style={{ fontSize: 68, fontWeight: 800, color: "#fff", lineHeight: 1.05, letterSpacing: "-0.04em", display: "flex", flexWrap: "wrap" }}>{title}</div>
          <div style={{ fontSize: 22, color: "#555", lineHeight: 1.5, display: "flex" }}>{desc}</div>
        </div>
        <span style={{ fontSize: 15, color: "#333", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>POSTHIVE.CO</span>
      </div>

      {/* Right — doc section list */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, padding: "64px 64px 64px 0", gap: 12 }}>
        {sections.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 24px" }}>
            <div style={{ width: 4, height: 36, borderRadius: 4, background: s.color, display: "flex", flexShrink: 0 }} />
            <span style={{ fontSize: 18, fontWeight: 600, color: "#ccc" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Layout: features ─────────────────────────────────────────────────────────

function FeaturesLayout({ logo, title, desc }: { logo: string; title: string; desc: string }) {
  const features = [
    { name: "Multi-platform posting",    badge: "Multi platforms" },
    { name: "Bulk CSV scheduling",       badge: "100s of posts" },
    { name: "Drag-to-reschedule",        badge: "Calendar" },
    { name: "Reels & Stories",           badge: "Instagram" },
    { name: "Per-platform overrides",    badge: "Pro" },
    { name: "First comment automation",  badge: "All plans" },
  ];
  return (
    <div style={{ width: 1200, height: 630, background: "#0a0a0a", display: "flex", position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      <Grid />
      <Glow top={-120} left={-120} size={500} opacity={0.22} />
      <Glow top={300} left={700} size={350} opacity={0.12} />
      <TopBar />

      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 72px", width: 480, gap: 20 }}>
        <Logo src={logo} />
        <Badge text="Features" />
        <div style={{ fontSize: 54, fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.03em", display: "flex", flexWrap: "wrap" }}>{title}</div>
        <div style={{ fontSize: 17, color: "#666", lineHeight: 1.5, display: "flex" }}>{desc}</div>
      </div>

      {/* Right — feature grid */}
      <div style={{ display: "flex", flexWrap: "wrap", alignContent: "center", flex: 1, padding: "60px 60px 60px 0", gap: 12 }}>
        {features.map((f) => (
          <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px", width: "47%" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5b63d3", display: "flex", flexShrink: 0, boxShadow: "0 0 8px rgba(91,99,211,0.8)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#ddd" }}>{f.name}</span>
              <span style={{ fontSize: 11, color: "#555" }}>{f.badge}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Layout: blog ─────────────────────────────────────────────────────────────

function BlogLayout({ logo, title, desc }: { logo: string; title: string; desc: string }) {
  return (
    <div style={{ width: 1200, height: 630, background: "#0c0c10", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      <Grid />
      <Glow top={-100} left={500} size={500} opacity={0.14} />
      {/* Top accent bar — thicker for blog */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, display: "flex", background: "linear-gradient(90deg, #5b63d3 0%, #a78bfa 50%, #f472b6 100%)" }} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "56px 80px", justifyContent: "space-between" }}>
        <Logo src={logo} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Badge text="Blog" />
          <div style={{ fontSize: 66, fontWeight: 800, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.03em", maxWidth: 900, display: "flex", flexWrap: "wrap" }}>{title}</div>
          <div style={{ fontSize: 20, color: "#666", maxWidth: 700, display: "flex" }}>{desc}</div>
        </div>

        {/* Bottom editorial bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#444" }}>posthive.co/blog</span>
          <div style={{ display: "flex", gap: 8 }}>
            {["Product", "Guides", "Updates"].map((tag) => (
              <div key={tag} style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "5px 12px" }}>
                <span style={{ fontSize: 12, color: "#666" }}>{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Layout: post ─────────────────────────────────────────────────────────────

function PostLayout({ logo, title, desc, badge, date }: { logo: string; title: string; desc: string; badge: string; date: string }) {
  return (
    <div style={{ width: 1200, height: 630, background: "#0c0c10", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      <Grid />
      <Glow top={200} left={700} size={500} opacity={0.14} />
      <TopBar />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "56px 100px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo src={logo} />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Badge text={badge || "Blog"} />
            <span style={{ fontSize: 13, color: "#444" }}>5 min read</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: title.length > 50 ? 46 : 56, fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.03em", display: "flex", flexWrap: "wrap" }}>{title}</div>
          <div style={{ fontSize: 20, color: "#666", lineHeight: 1.55, display: "flex" }}>{desc}</div>
        </div>

        {/* Author row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #5b63d3, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>G</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#ededed" }}>Guna</span>
            <span style={{ fontSize: 12, color: "#555" }}>Founder, Posthive</span>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 13, color: "#444" }}>{date}</div>
        </div>
      </div>
    </div>
  );
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const title  = searchParams.get("title")  ?? "Schedule posts to 7 platforms";
  const desc   = searchParams.get("desc")   ?? "Write once, publish everywhere.";
  const badge  = searchParams.get("badge")  ?? "";
  const layout = searchParams.get("layout") ?? "home";
  const date   = searchParams.get("date")   ?? "July 3, 2026";

  const logoSrc = await fetch(`${origin}/posthivemain.png`)
    .then((r) => r.arrayBuffer())
    .then((buf) => `data:image/png;base64,${Buffer.from(buf).toString("base64")}`);

  const props = { logo: logoSrc, title, desc, badge, date };

  const node =
    layout === "pricing"  ? <PricingLayout  {...props} /> :
    layout === "docs"     ? <DocsLayout     {...props} /> :
    layout === "features" ? <FeaturesLayout {...props} /> :
    layout === "blog"     ? <BlogLayout     {...props} /> :
    layout === "post"     ? <PostLayout     {...props} /> :
                            <HomeLayout     {...props} />;

  return new ImageResponse(node, { width: 1200, height: 630 });
}
