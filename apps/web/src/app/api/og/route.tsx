import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "Posthive";
  const desc = searchParams.get("desc") ?? "Schedule posts to 7 platforms from one place.";
  const badge = searchParams.get("badge") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px 100px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(91,99,211,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(91,99,211,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(91,99,211,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#5b63d3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#fff",
            }}
          >
            P
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#ededed", letterSpacing: "-0.02em" }}>
            Posthive
          </span>
        </div>

        {badge && (
          <div
            style={{
              background: "rgba(91,99,211,0.15)",
              border: "1px solid rgba(91,99,211,0.35)",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 700,
              color: "#9ba2ee",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 24,
              display: "flex",
            }}
          >
            {badge}
          </div>
        )}

        <div
          style={{
            fontSize: title.length > 40 ? 52 : 64,
            fontWeight: 800,
            color: "#ededed",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: 860,
            marginBottom: 28,
            display: "flex",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 22,
            color: "#666",
            lineHeight: 1.5,
            maxWidth: 700,
            display: "flex",
          }}
        >
          {desc}
        </div>

        {/* Bottom platforms row */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 100,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          {["Bluesky", "Threads", "Instagram", "LinkedIn", "Mastodon", "YouTube", "Facebook"].map((p) => (
            <div
              key={p}
              style={{
                fontSize: 11,
                color: "#444",
                background: "#111",
                border: "1px solid #222",
                borderRadius: 6,
                padding: "4px 10px",
                display: "flex",
              }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
