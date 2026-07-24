import Link from "next/link";

export function BlogCtaBanner() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, flexWrap: "wrap",
      background: "rgba(91,99,211,0.07)",
      border: "1px solid rgba(91,99,211,0.18)",
      borderLeft: "3px solid #5b63d3",
      borderRadius: "0 10px 10px 0",
      padding: "14px 18px",
      margin: "0 0 40px",
    }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#ededed", margin: "0 0 3px" }}>
          Try Posthive free — no credit card required
        </p>
        <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
          14 platforms, flat pricing, 14-day trial.
        </p>
      </div>
      <Link
        href="/register"
        style={{
          display: "inline-flex", alignItems: "center",
          fontSize: 13, fontWeight: 600,
          padding: "8px 16px", borderRadius: 7,
          background: "#5b63d3", color: "#fff", textDecoration: "none",
          whiteSpace: "nowrap", flexShrink: 0,
        }}
      >
        Start free →
      </Link>
    </div>
  );
}
