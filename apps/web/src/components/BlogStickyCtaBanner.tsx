"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function BlogStickyCtaBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrolled > 0.25) setVisible(true);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (dismissed || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(560px, calc(100vw - 32px))",
        background: "#111111",
        border: "1px solid #2a2a2a",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        animation: "slideUp 0.25s ease",
      }}
    >
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#ededed", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Schedule posts across 15 platforms
        </p>
        <p style={{ fontSize: 12, color: "#666", margin: 0 }}>
          14-day free trial · no credit card
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Link
          href="/register"
          style={{
            fontSize: 13, fontWeight: 600,
            padding: "8px 16px", borderRadius: 8,
            background: "#5b63d3", color: "#fff",
            textDecoration: "none", whiteSpace: "nowrap",
          }}
        >
          Start free →
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{
            background: "transparent", border: "none",
            color: "#444", cursor: "pointer",
            fontSize: 18, lineHeight: 1, padding: "4px 6px",
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
