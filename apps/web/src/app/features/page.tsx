"use client";

import { useAuth } from "../../context/AuthContext";
import { NavBar } from "../../components/LandingNav";

export default function FeaturesPage() {
  const { user } = useAuth();
  const ctaHref = user ? "/compose" : "/register";
  const navCtaLabel = user ? "Go to scheduler" : "Start for free";

  return (
    <>
      <NavBar user={!!user} ctaHref={ctaHref} navCtaLabel={navCtaLabel} />
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .fade-up-2 { animation: fadeUp 0.6s 0.15s ease both; }
        .fade-up-3 { animation: fadeUp 0.6s 0.3s ease both; }

        .cta-primary:hover { background: #f0f0f0 !important; }
        .cta-secondary:hover { background: rgba(255,255,255,0.07) !important; }

        .platform-chip:hover { border-color: rgba(91,99,211,0.5) !important; background: rgba(91,99,211,0.08) !important; }

        .feature-visual { transition: box-shadow 0.3s ease; }
        .feature-visual:hover { box-shadow: 0 0 40px rgba(91,99,211,0.12); }

        .support-table tr:hover td { background: rgba(255,255,255,0.02); }

        .footer-link:hover { color: #ededed !important; }

        .github-link:hover { border-color: rgba(91,99,211,0.6) !important; background: rgba(91,99,211,0.1) !important; }

        @media (max-width: 768px) {
          .feature-grid { grid-template-columns: 1fr !important; direction: ltr !important; }
          .feature-grid > * { direction: ltr !important; order: unset !important; }
          .hero-btns { flex-direction: column; align-items: center; }
        }
      `}</style>

      <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ededed", fontFamily: "system-ui, -apple-system, sans-serif", paddingTop: 64 }}>

        {/* HERO */}
        <section style={{ textAlign: "center", padding: "120px 40px 80px", maxWidth: 800, margin: "0 auto" }}>
          <div className="fade-up" style={{ display: "inline-block", background: "rgba(91,99,211,0.12)", border: "1px solid rgba(91,99,211,0.25)", borderRadius: 999, padding: "4px 14px", fontSize: 12, color: "#9ba2ee", marginBottom: 24, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Everything you need to ship social content
          </div>
          <h1 className="fade-up-2" style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 24px", background: "linear-gradient(135deg, #ffffff 0%, #c7caff 45%, #5b63d3 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            One composer.<br />Every platform.
          </h1>
          <p className="fade-up-3" style={{ fontSize: 18, color: "#888", lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: "0 auto 40px" }}>
            Posthive gives you a polished scheduling workflow for Bluesky, Threads, Instagram, LinkedIn, and Mastodon — without the bloat of enterprise tools.
          </p>
          <div className="fade-up-3 hero-btns" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/register" className="cta-primary" style={{ background: "#fff", color: "#0a0a0a", padding: "12px 28px", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 15, transition: "background 0.2s" }}>
              Start for free
            </a>
            <a href="/#pricing" className="cta-secondary" style={{ background: "transparent", color: "#ededed", padding: "12px 28px", borderRadius: 8, textDecoration: "none", fontWeight: 500, fontSize: 15, border: "1px solid #2a2a2a", transition: "background 0.2s" }}>
              View pricing
            </a>
          </div>
        </section>

        {/* FEATURES */}

        {/* 1 — Multi-platform composer */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="feature-grid" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(91,99,211,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#9ba2ee" strokeWidth="1.5"/><path d="M6 10h8M10 6v8" stroke="#9ba2ee" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontSize: 12, color: "#9ba2ee", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Multi-platform</span>
              </div>
              <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>Write once,<br />post everywhere</h2>
              <p style={{ color: "#888", lineHeight: 1.8, fontSize: 16, marginBottom: 28 }}>
                Compose your post in a single editor and publish to every connected account simultaneously. Each platform renders its own preview — character limits, hashtags, and link handling all accounted for.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  { name: "Bluesky", domain: "bsky.app" },
                  { name: "Threads", domain: "threads.net" },
                  { name: "Instagram", domain: "instagram.com" },
                  { name: "LinkedIn", domain: "linkedin.com" },
                  { name: "Mastodon", domain: "mastodon.social" },
                ].map((p) => (
                  <span key={p.domain} className="platform-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, border: "1px solid #2a2a2a", background: "#111", fontSize: 13, color: "#ededed", transition: "border-color 0.2s, background 0.2s", cursor: "default" }}>
                    <img src={`https://www.google.com/s2/favicons?domain=${p.domain}&sz=32`} alt={p.name} width={14} height={14} style={{ borderRadius: 2 }} />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="feature-visual" style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 32, minHeight: 280 }}>
              {/* Composer mockup */}
              <div style={{ background: "#0a0a0a", borderRadius: 10, border: "1px solid #2a2a2a", padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "#ededed", lineHeight: 1.6, minHeight: 80 }}>
                  Just shipped a new feature 🚀 Thread-safe scheduling across all your favorite platforms. No more copy-paste marathons.
                  <span style={{ display: "inline-block", width: 2, height: 14, background: "#5b63d3", marginLeft: 2, verticalAlign: "middle", animation: "fadeUp 1s infinite alternate" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {["bsky.app", "threads.net", "instagram.com"].map((d) => (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(91,99,211,0.12)", border: "1px solid rgba(91,99,211,0.25)", fontSize: 12 }}>
                    <img src={`https://www.google.com/s2/favicons?domain=${d}&sz=32`} alt={d} width={12} height={12} />
                    <span style={{ color: "#9ba2ee" }}>{d.replace(".app", "").replace(".net", "").replace(".com", "")}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#888" }}>287 / 300 chars</span>
                <div style={{ background: "#fff", color: "#0a0a0a", fontSize: 12, fontWeight: 600, padding: "6px 16px", borderRadius: 6 }}>Schedule</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2 — Instagram Reels & Stories (reversed) */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="feature-grid" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", direction: "rtl" }}>
            <div style={{ direction: "ltr" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(91,99,211,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="3" stroke="#9ba2ee" strokeWidth="1.5"/><path d="M8 7.5l5 2.5-5 2.5V7.5z" fill="#9ba2ee"/></svg>
                </div>
                <span style={{ fontSize: 12, color: "#9ba2ee", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Instagram</span>
                <span style={{ background: "rgba(91,99,211,.15)", color: "#9ba2ee", border: "1px solid rgba(91,99,211,.3)", fontSize: 11, padding: "2px 8px", borderRadius: 999 }}>Pro</span>
              </div>
              <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>Reels, Stories,<br />and Carousels</h2>
              <p style={{ color: "#888", lineHeight: 1.8, fontSize: 16, marginBottom: 20 }}>
                Full Instagram media support baked in. Schedule a Reel with a cover thumbnail, a Story from any image or video, or a carousel post with up to 10 slides — all from the same composer.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["Reel — short-form video with caption", "Story — image or video, 24-hour expiry", "Post — static or carousel up to 10 images"].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 2, flexShrink: 0 }}><circle cx="8" cy="8" r="7" stroke="#5b63d3" strokeWidth="1.2"/><path d="M5 8l2 2 4-4" stroke="#5b63d3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="feature-visual" style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 32, minHeight: 280, direction: "ltr" }}>
              {/* Instagram type selector mockup */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>Post type</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Post", "Reel", "Story"].map((t, i) => (
                    <div key={t} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 8, border: i === 1 ? "1px solid rgba(91,99,211,0.5)" : "1px solid #2a2a2a", background: i === 1 ? "rgba(91,99,211,0.12)" : "transparent", fontSize: 13, color: i === 1 ? "#9ba2ee" : "#888", fontWeight: i === 1 ? 600 : 400 }}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ border: "1px dashed #2a2a2a", borderRadius: 10, height: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="24" height="24" rx="4" stroke="#444" strokeWidth="1.5"/><path d="M10 14l3 3 5-6" stroke="#5b63d3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 12, color: "#555" }}>Drop video here</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[1,2,3].map((n) => (
                  <div key={n} style={{ flex: 1, height: 48, borderRadius: 6, background: `rgba(91,99,211,${0.04 * n + 0.06})`, border: "1px solid #2a2a2a" }} />
                ))}
                <div style={{ width: 48, height: 48, borderRadius: 6, border: "1px dashed #333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#555", fontSize: 20 }}>+</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 — Calendar */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="feature-grid" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(91,99,211,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="14" rx="2" stroke="#9ba2ee" strokeWidth="1.5"/><path d="M6 2v3M14 2v3M2 8h16" stroke="#9ba2ee" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontSize: 12, color: "#9ba2ee", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Calendar</span>
              </div>
              <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>Drag to reschedule.<br />Instantly.</h2>
              <p style={{ color: "#888", lineHeight: 1.8, fontSize: 16, marginBottom: 20 }}>
                See your entire content pipeline on a month, week, or day calendar. Drag any scheduled post to a new date and time — the job is rescheduled server-side in real time.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["Month, week, and day views", "Drag-and-drop rescheduling", "Color-coded by platform"].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 2, flexShrink: 0 }}><circle cx="8" cy="8" r="7" stroke="#5b63d3" strokeWidth="1.2"/><path d="M5 8l2 2 4-4" stroke="#5b63d3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="feature-visual" style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 24, minHeight: 280, direction: "ltr" }}>
              {/* Mini calendar mockup */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>June 2026</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Mo", "We", "Fr"].map((v) => (
                    <span key={v} style={{ fontSize: 11, color: "#888", background: "#0a0a0a", padding: "2px 8px", borderRadius: 4 }}>{v}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 8 }}>
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                  <div key={d} style={{ textAlign: "center", fontSize: 10, color: "#555", padding: "4px 0" }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i - 0;
                  const num = day + 1;
                  const hasPost = [3, 7, 10, 15, 17, 22, 24, 28].includes(num);
                  const isToday = num === 29;
                  return (
                    <div key={i} style={{ minHeight: 36, borderRadius: 6, background: isToday ? "rgba(91,99,211,0.2)" : "rgba(255,255,255,0.02)", border: isToday ? "1px solid rgba(91,99,211,0.4)" : "1px solid transparent", padding: 3, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 10, color: isToday ? "#9ba2ee" : num > 30 ? "#333" : "#666", textAlign: "right", lineHeight: 1 }}>{num <= 30 ? num : num - 30}</span>
                      {hasPost && num <= 30 && (
                        <div style={{ height: 4, borderRadius: 2, background: num % 3 === 0 ? "#5b63d3" : num % 3 === 1 ? "#4a9eff" : "#b35ef7" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 4 — First comment (reversed) */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="feature-grid" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", direction: "rtl" }}>
            <div style={{ direction: "ltr" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(91,99,211,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H7l-4 3V5a1 1 0 011-1z" stroke="#9ba2ee" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                </div>
                <span style={{ fontSize: 12, color: "#9ba2ee", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>First comment</span>
              </div>
              <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>Auto-post the<br />perfect reply</h2>
              <p style={{ color: "#888", lineHeight: 1.8, fontSize: 16, marginBottom: 20 }}>
                Add a first comment that fires immediately after your post goes live. Use it for hashtag stacks, affiliate links, thread continuations, or CTAs you don&apos;t want cluttering your main copy.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["Fires within seconds of the main post", "Per-platform override supported", "Perfect for hashtag stacking on Instagram"].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 2, flexShrink: 0 }}><circle cx="8" cy="8" r="7" stroke="#5b63d3" strokeWidth="1.2"/><path d="M5 8l2 2 4-4" stroke="#5b63d3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="feature-visual" style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 28, minHeight: 280, direction: "ltr" }}>
              {/* Thread mockup */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#5b63d3,#9ba2ee)" }} />
                  <div style={{ width: 2, flex: 1, background: "#2a2a2a", marginTop: 6 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>yourhandle <span style={{ fontWeight: 400, color: "#888" }}>· just now</span></div>
                  <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>
                    Shipping features faster than ever with Posthive. The async workflow is a game-changer.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 16 }}>
                    {[["♥", "24"], ["↩", "6"], ["⇅", "3"]].map(([icon, count]) => (
                      <span key={icon} style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 4 }}>{icon} {count}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#5b63d3,#9ba2ee)", flexShrink: 0 }} />
                <div style={{ flex: 1, background: "rgba(91,99,211,0.07)", border: "1px solid rgba(91,99,211,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "#9ba2ee", fontWeight: 600, marginBottom: 4 }}>First comment · auto-posted</div>
                  <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
                    #buildinpublic #saas #indiedev #productivity #scheduling
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5 — Per-platform overrides */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="feature-grid" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(91,99,211,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M4 10h8M4 14h10" stroke="#9ba2ee" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <span style={{ fontSize: 12, color: "#9ba2ee", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Per-platform</span>
                <span style={{ background: "rgba(91,99,211,.15)", color: "#9ba2ee", border: "1px solid rgba(91,99,211,.3)", fontSize: 11, padding: "2px 8px", borderRadius: 999 }}>Pro</span>
              </div>
              <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>Tailor every post<br />per account</h2>
              <p style={{ color: "#888", lineHeight: 1.8, fontSize: 16, marginBottom: 20 }}>
                One base post, multiple voices. Override the caption and first comment for each connected account. Your Bluesky audience gets the long-form take; your Threads followers get the hook.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {["Override text per connected account", "Override first comment per account", "Fallback to global copy if no override set"].map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#ccc" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 2, flexShrink: 0 }}><circle cx="8" cy="8" r="7" stroke="#5b63d3" strokeWidth="1.2"/><path d="M5 8l2 2 4-4" stroke="#5b63d3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="feature-visual" style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 28, minHeight: 280 }}>
              {/* Override UI mockup */}
              {[
                { platform: "bsky.app", label: "Bluesky", active: true, text: "Long-form thoughts on async content workflows and why scheduling beats publishing live..." },
                { platform: "threads.net", label: "Threads", active: false, text: "Hot take: scheduled posts perform better than live ones. Here's why 👇" },
              ].map((p) => (
                <div key={p.label} style={{ marginBottom: 16, borderRadius: 10, border: p.active ? "1px solid rgba(91,99,211,0.35)" : "1px solid #2a2a2a", background: p.active ? "rgba(91,99,211,0.06)" : "transparent", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <img src={`https://www.google.com/s2/favicons?domain=${p.platform}&sz=32`} alt={p.label} width={14} height={14} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: p.active ? "#9ba2ee" : "#888" }}>{p.label}</span>
                    {p.active && <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ba2ee", background: "rgba(91,99,211,0.15)", padding: "1px 8px", borderRadius: 999 }}>Override active</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>{p.text}</div>
                </div>
              ))}
              <div style={{ textAlign: "center", fontSize: 12, color: "#555" }}>+ 3 more accounts using global copy</div>
            </div>
          </div>
        </section>

        {/* 6 — Open source (reversed) */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="feature-grid" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center", direction: "rtl" }}>
            <div style={{ direction: "ltr" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(91,99,211,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2C5.58 2 2 5.58 2 10c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0018 10c0-4.42-3.58-8-8-8z" fill="#9ba2ee"/></svg>
                </div>
                <span style={{ fontSize: 12, color: "#9ba2ee", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Open source</span>
                <span style={{ background: "rgba(91,99,211,.15)", color: "#9ba2ee", border: "1px solid rgba(91,99,211,.3)", fontSize: 11, padding: "2px 8px", borderRadius: 999 }}>AGPL-3.0</span>
              </div>
              <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>Your data.<br />Your server.</h2>
              <p style={{ color: "#888", lineHeight: 1.8, fontSize: 16, marginBottom: 24 }}>
                Posthive is fully open source under AGPL-3.0. Self-host on your own infrastructure, inspect every line of code, and never worry about vendor lock-in or surprise shutdowns.
              </p>
              <a href="https://github.com/AstaBlackClove/posthive" target="_blank" rel="noopener noreferrer" className="github-link" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 8, border: "1px solid #2a2a2a", textDecoration: "none", color: "#ededed", fontSize: 14, fontWeight: 500, transition: "border-color 0.2s, background 0.2s" }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2C5.58 2 2 5.58 2 10c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0018 10c0-4.42-3.58-8-8-8z" fill="currentColor"/></svg>
                View on GitHub
              </a>
            </div>
            <div className="feature-visual" style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 28, minHeight: 280, direction: "ltr", fontFamily: "'Fira Code', 'Courier New', monospace" }}>
              {/* Code mockup */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              </div>
              <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.8, overflowX: "auto", color: "#ccc" }}>
{`<span style="color:#888"># Self-host in 3 steps</span>

<span style="color:#9ba2ee">git</span> clone github.com/AstaBlackClove/posthive

<span style="color:#9ba2ee">cp</span> apps/api/.env.example apps/api/.env
<span style="color:#888"># fill in your secrets</span>

<span style="color:#9ba2ee">pnpm</span> install <span style="color:#888">&amp;&amp;</span> <span style="color:#9ba2ee">pnpm</span> dev`}
              </pre>
              <div style={{ marginTop: 20, padding: "10px 14px", background: "rgba(40,200,64,0.06)", border: "1px solid rgba(40,200,64,0.15)", borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: "#28c840" }}>✓ Running at http://localhost:3000</span>
              </div>
            </div>
          </div>
        </section>

        {/* PLATFORM SUPPORT TABLE */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "80px 40px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: 12 }}>Platform support</h2>
              <p style={{ color: "#888", fontSize: 16 }}>Every platform Posthive supports today — and what it can do.</p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="support-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Platform", "Auth method", "Char limit", "Media", "Status"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: "#888", fontWeight: 500, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { domain: "bsky.app", name: "Bluesky", auth: "App password", limit: "300", media: "Images", status: "Live" },
                    { domain: "threads.net", name: "Threads", auth: "OAuth 2.0", limit: "500", media: "Images", status: "Live" },
                    { domain: "instagram.com", name: "Instagram", auth: "OAuth 2.0", limit: "2,200", media: "Images / Video / Reels / Stories", status: "Live" },
                    { domain: "linkedin.com", name: "LinkedIn", auth: "OAuth 2.0", limit: "3,000", media: "Images *", status: "Live" },
                    { domain: "mastodon.social", name: "Mastodon", auth: "OAuth 2.0", limit: "500", media: "Images", status: "Live" },
                  ].map((row) => (
                    <tr key={row.name} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <img src={`https://www.google.com/s2/favicons?domain=${row.domain}&sz=32`} alt={row.name} width={16} height={16} style={{ borderRadius: 2 }} />
                          <span style={{ fontWeight: 500 }}>{row.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#aaa" }}>{row.auth}</td>
                      <td style={{ padding: "14px 16px", color: "#aaa", fontFamily: "monospace" }}>{row.limit}</td>
                      <td style={{ padding: "14px 16px", color: "#aaa" }}>{row.media}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(40,200,64,0.08)", border: "1px solid rgba(40,200,64,0.2)", borderRadius: 999, padding: "2px 10px", fontSize: 12, color: "#28c840" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: "#555", fontSize: 12, marginTop: 16, paddingLeft: 16 }}>* LinkedIn media requires elevated API access</p>
          </div>
        </section>

        {/* CTA */}
        <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "80px 40px" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", background: "rgba(91,99,211,0.06)", border: "1px solid rgba(91,99,211,0.18)", borderRadius: 20, padding: "64px 48px" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>Ready to schedule smarter?</h2>
            <p style={{ color: "#888", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              Join creators and teams who use Posthive to stay consistent across every platform.
            </p>
            <a href="/register" className="cta-primary" style={{ display: "inline-block", background: "#fff", color: "#0a0a0a", padding: "14px 36px", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 16, transition: "background 0.2s", marginBottom: 14 }}>
              Start your free 14-day trial
            </a>
            <div style={{ fontSize: 13, color: "#555" }}>No credit card required</div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: "1px solid #2a2a2a", padding: "32px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#555" }}>© {new Date().getFullYear()} Posthive. All rights reserved.</span>
          <div style={{ display: "flex", gap: 24 }}>
            <a href="/privacy" className="footer-link" style={{ fontSize: 13, color: "#555", textDecoration: "none", transition: "color 0.2s" }}>Privacy</a>
            <a href="/terms" className="footer-link" style={{ fontSize: 13, color: "#555", textDecoration: "none", transition: "color 0.2s" }}>Terms</a>
          </div>
        </footer>

      </div>
    </>
  );
}
