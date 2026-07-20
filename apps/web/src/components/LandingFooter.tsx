"use client";

import Link from "next/link";
import Image from "next/image";
import { FEATURES_NAV } from "./LandingNav";

export function LandingFooter() {
  return (
    <footer style={{ borderTop: "1px solid #161616", background: "#0a0a0a" }}>
      <style>{`
        .ph-footer-inner { display: grid; grid-template-columns: 260px 1fr; gap: 64px; }
        .ph-foot-cols { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; }
        @media (max-width: 900px) {
          .ph-footer-inner { grid-template-columns: 1fr !important; gap: 40px !important; }
          .ph-foot-cols { grid-template-columns: repeat(2, 1fr) !important; gap: 28px !important; }
        }
        @media (max-width: 480px) {
          .ph-foot-cols { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div
        style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 40px 48px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 64 }}
        className="ph-footer-inner"
      >
        {/* Brand column */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Image src="/posthivemain.png" alt="Posthive" width={28} height={28} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "#ededed" }}>Posthive</span>
          </div>
          <p style={{ fontSize: 13.5, color: "#555", lineHeight: 1.65, margin: "0 0 24px" }}>
            The social media scheduler built for creators and teams. Write once, publish everywhere.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              {
                href: "https://github.com/AstaBlackClove/posthive",
                label: "GitHub",
                icon: (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                ),
              },
              {
                href: "https://x.com/gunaa_dev",
                label: "X",
                icon: (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                ),
              },
              {
                href: "https://www.linkedin.com/in/guna-sheelan-aa5325254/",
                label: "LinkedIn",
                icon: (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                ),
              },
            ].map(({ href, label, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", textDecoration: "none", transition: "all 150ms" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ededed"; e.currentTarget.style.borderColor = "#444"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#222"; }}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 40 }} className="ph-foot-cols">

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 11, letterSpacing: ".1em", color: "#444", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" as const }}>Features</span>
            {FEATURES_NAV.map(f => (
              <Link
                key={f.slug}
                href={`/features/${f.slug}`}
                style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#666", fontSize: 13.5 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ededed")}
                onMouseLeave={e => (e.currentTarget.style.color = "#666")}
              >
                <span style={{ color: f.color, display: "flex", flexShrink: 0 }}>{f.icon}</span>
                {f.title}
              </Link>
            ))}
          </div>

          {/* Product */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 11, letterSpacing: ".1em", color: "#444", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" as const }}>Product</span>
            {([
              ["/pricing", "Pricing"],
              ["/blog", "Blog"],
              ["/docs", "Docs"],
              ["https://github.com/AstaBlackClove/posthive", "GitHub"],
            ] as [string, string][]).map(([href, label]) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                style={{ textDecoration: "none", color: "#666", fontSize: 13.5 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ededed")}
                onMouseLeave={e => (e.currentTarget.style.color = "#666")}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Company */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 11, letterSpacing: ".1em", color: "#444", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" as const }}>Company</span>
            {([
              ["mailto:guna@posthive.co", "Contact us"],
              ["/privacy", "Privacy policy"],
              ["/terms", "Terms of service"],
            ] as [string, string][]).map(([href, label]) => (
              <a
                key={label}
                href={href}
                style={{ textDecoration: "none", color: "#666", fontSize: 13.5 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ededed")}
                onMouseLeave={e => (e.currentTarget.style.color = "#666")}
              >
                {label}
              </a>
            ))}
          </div>

        </div>
      </div>

      <div style={{ borderTop: "1px solid #161616" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "#444" }}>© {new Date().getFullYear()} Posthive. All rights reserved.</span>
          <span style={{ fontSize: 12.5, color: "#444" }}>Open-source · AGPL-3.0 · Built by an indie builder.</span>
        </div>
      </div>
    </footer>
  );
}
