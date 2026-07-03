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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const title = searchParams.get("title") ?? "Schedule posts to 7 platforms";
  const desc  = searchParams.get("desc")  ?? "Write once, publish everywhere. Bluesky, Threads, Instagram, LinkedIn, Mastodon, YouTube and Facebook.";
  const badge = searchParams.get("badge") ?? "";

  const logoSrc = await fetch(`${origin}/posthivemain.png`)
    .then((r) => r.arrayBuffer())
    .then((buf) => `data:image/png;base64,${Buffer.from(buf).toString("base64")}`);

  const fontSize = title.length > 38 ? 54 : title.length > 28 ? 62 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(91,99,211,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(91,99,211,0.07) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          display: "flex",
        }} />

        {/* Large glow top-left */}
        <div style={{
          position: "absolute", top: -160, left: -160,
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(91,99,211,0.28) 0%, transparent 65%)",
          display: "flex",
        }} />

        {/* Smaller glow bottom-right */}
        <div style={{
          position: "absolute", bottom: -120, right: -80,
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(91,99,211,0.14) 0%, transparent 65%)",
          display: "flex",
        }} />

        {/* Top accent bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, #5b63d3 0%, #818cf8 50%, transparent 100%)",
          display: "flex",
        }} />

        {/* Content */}
        <div style={{
          display: "flex", flexDirection: "column",
          padding: "60px 80px", flex: 1,
        }}>

          {/* Logo + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "auto" }}>
            <img src={logoSrc} alt="" width={46} height={46} style={{ borderRadius: 11, display: "flex" }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: "#ededed", letterSpacing: "-0.01em" }}>
              Posthive
            </span>
            {badge && (
              <div style={{
                marginLeft: 10,
                background: "rgba(91,99,211,0.18)",
                border: "1px solid rgba(91,99,211,0.4)",
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: 11, fontWeight: 700, color: "#9ba2ee",
                letterSpacing: "0.1em", textTransform: "uppercase",
                display: "flex",
              }}>
                {badge}
              </div>
            )}
          </div>

          {/* Main headline */}
          <div style={{
            fontSize,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: 900,
            marginBottom: 24,
            display: "flex",
            flexWrap: "wrap",
          }}>
            {title}
          </div>

          {/* Description */}
          <div style={{
            fontSize: 20,
            color: "#777",
            lineHeight: 1.55,
            maxWidth: 720,
            marginBottom: 48,
            display: "flex",
          }}>
            {desc}
          </div>

          {/* Platform pills */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {PLATFORMS.map((p) => (
              <div key={p.name} style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: "7px 13px",
              }}>
                {/* Color dot */}
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: p.color, display: "flex",
                  boxShadow: `0 0 6px ${p.color}`,
                }} />
                <span style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right decorative panel */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 320,
          background: "linear-gradient(180deg, rgba(91,99,211,0.06) 0%, rgba(91,99,211,0.02) 100%)",
          borderLeft: "1px solid rgba(91,99,211,0.12)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16, padding: "0 40px",
        }}>
          {/* Stat cards */}
          {[
            { n: "7", label: "Platforms" },
            { n: "1x", label: "Write" },
            { n: "∞", label: "Reach" },
          ].map((s) => (
            <div key={s.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "18px 28px", width: "100%",
            }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#9ba2ee", letterSpacing: "-0.02em" }}>{s.n}</span>
              <span style={{ fontSize: 12, color: "#555", marginTop: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
