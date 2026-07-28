import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        textAlign: "center",
        padding: "40px 24px",
      }}
    >
      <div style={{ fontSize: 64, fontWeight: 700, color: "#2a2a2a", lineHeight: 1 }}>404</div>
      <div style={{ fontSize: 18, fontWeight: 500, color: "#ededed" }}>Page not found</div>
      <div style={{ fontSize: 14, color: "#888", maxWidth: 320 }}>
        The page you're looking for doesn't exist or has been moved.
      </div>
      <Link
        href="/compose"
        style={{
          marginTop: 8,
          padding: "10px 20px",
          borderRadius: 8,
          backgroundColor: "#ffffff",
          color: "#0a0a0a",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Go to Compose
      </Link>
    </div>
  );
}
