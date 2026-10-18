"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

const DISMISS_KEY = "ph_ob_done";
const COLLAPSE_KEY = "ph_ob_collapsed";
const accent = "#5b63d3";

const STEPS = [
  {
    id: "connect",
    title: "Connect an account",
    hint: "Link Bluesky, LinkedIn, Instagram and more",
    action: "/accounts",
    cta: "Go to Accounts →",
  },
  {
    id: "post",
    title: "Write your first post",
    hint: "Compose and save a draft or schedule it",
    action: "/compose",
    cta: "Open Compose →",
  },
  {
    id: "schedule",
    title: "Schedule a post",
    hint: "Pick a time and hit Schedule Post",
    action: null,
    cta: null,
  },
];

export function OnboardingChecklist() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({ connect: false, post: false, schedule: false });
  const bodyRef = useRef<HTMLDivElement>(null);

  function checkProgress() {
    Promise.allSettled([
      apiFetch<{ id: string }[]>("/accounts"),
      apiFetch<{ items: { scheduledFor: string | null; status: string }[] }>("/jobs?limit=50"),
    ]).then(([accounts, jobs]) => {
      const hasAccount = accounts.status === "fulfilled" && accounts.value.length > 0;
      const allJobs = jobs.status === "fulfilled" ? jobs.value.items : [];
      const hasPost = allJobs.length > 0;
      const hasScheduled = allJobs.some((j) => j.scheduledFor && j.status !== "draft");
      setDone({ connect: hasAccount, post: hasPost, schedule: hasScheduled });
    });
  }

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    setDismissed(false);
    checkProgress();

    // Re-check on tab focus (external browser switch) and on custom events from compose/accounts
    function onVisible() {
      if (document.visibilityState === "visible") checkProgress();
    }
    function onUpdate() { checkProgress(); }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("ph:account-connected", onUpdate);
    window.addEventListener("ph:post-scheduled", onUpdate);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("ph:account-connected", onUpdate);
      window.removeEventListener("ph:post-scheduled", onUpdate);
    };
  }, []);

  function toggleCollapse(val: boolean) {
    setAnimating(true);
    localStorage.setItem(COLLAPSE_KEY, val ? "1" : "0");
    setCollapsed(val);
    setTimeout(() => setAnimating(false), 320);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  const completedCount = Object.values(done).filter(Boolean).length;
  const total = STEPS.length;
  const allDone = completedCount === total;
  const activeStepId = STEPS.find((s) => !done[s.id])?.id ?? null;

  /* Collapsed pill */
  if (collapsed) {
    return (
      <button
        onClick={() => toggleCollapse(false)}
        style={{
          position: "fixed",
          bottom: 85,
          right: 24,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderRadius: 14,
          background: "#161616",
          border: `1px solid ${accent}55`,
          boxShadow: `0 4px 20px rgba(91,99,211,0.25)`,
          cursor: "pointer",
          animation: animating ? "ph-slide-up 0.28s cubic-bezier(.32,1.2,.42,1) both" : "none",
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          background: allDone ? "#10B981" : accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
            <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#ededed" }}>Getting started</span>
        <span style={{
          fontSize: 12, fontWeight: 700,
          padding: "2px 8px", borderRadius: 20,
          background: allDone ? "rgba(16,185,129,0.15)" : `${accent}22`,
          color: allDone ? "#10B981" : accent,
        }}>
          {completedCount}/{total}
        </span>
        {/* Expand chevron */}
        <svg width="12" height="12" fill="none" viewBox="0 0 12 12" style={{ color: "#555", marginLeft: 2 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <style>{`
          @keyframes ph-slide-up {
            from { opacity: 0; transform: translateY(16px) scale(0.94); }
            to   { opacity: 1; transform: translateY(0)   scale(1); }
          }
          @keyframes ph-slide-down {
            from { opacity: 0; transform: translateY(-10px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
          }
        `}</style>
      </button>
    );
  }

  /* Expanded panel */
  return (
    <div style={{
      position: "fixed",
      bottom: 85,
      right: 24,
      zIndex: 50,
      width: 300,
      borderRadius: 18,
      overflow: "hidden",
      background: "#141414",
      border: `1px solid #2a2a2a`,
      boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
      animation: animating ? "ph-slide-down 0.3s cubic-bezier(.32,1.2,.42,1) both" : "none",
    }}>
      <style>{`
        @keyframes ph-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes ph-slide-down {
          from { opacity: 0; transform: translateY(-10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", borderBottom: "1px solid #222",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ededed" }}>Getting started</span>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
            background: allDone ? "rgba(16,185,129,0.15)" : `${accent}22`,
            color: allDone ? "#10B981" : accent,
          }}>
            {completedCount}/{total}
          </span>
        </div>
        <button
          onClick={() => toggleCollapse(true)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#444", borderRadius: 6 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 12 12">
            <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#222" }}>
        <div style={{
          height: "100%",
          background: allDone ? "#10B981" : accent,
          width: `${(completedCount / total) * 100}%`,
          transition: "width 0.5s ease",
          borderRadius: "0 2px 2px 0",
        }} />
      </div>

      {/* Steps */}
      <div ref={bodyRef} style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
        {STEPS.map((step) => {
          const isDone = done[step.id];
          const isActive = step.id === activeStepId;
          return (
            <div key={step.id} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "10px 12px",
              borderRadius: 12,
              border: isActive ? `1.5px solid ${accent}88` : "1.5px solid transparent",
              background: isActive ? `${accent}18` : isDone ? "transparent" : "#1a1a1a",
              transition: "all 0.2s ease",
            }}>
              {/* Circle */}
              <div style={{
                flexShrink: 0,
                width: 22, height: 22, borderRadius: "50%",
                marginTop: 1,
                background: isDone ? "#10B981" : isActive ? `${accent}33` : "transparent",
                border: isDone ? "none" : isActive ? `2px solid ${accent}` : "2px solid #383838",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
                boxShadow: isActive ? `0 0 0 3px ${accent}22` : "none",
              }}>
                {isDone && (
                  <svg width="11" height="11" fill="none" viewBox="0 0 10 10">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isActive && !isDone && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: accent }} />
                )}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, fontWeight: isActive ? 600 : 500, lineHeight: 1.35,
                  color: isDone ? "#444" : isActive ? "#fff" : "#aaa",
                  textDecoration: isDone ? "line-through" : "none",
                  margin: 0,
                }}>
                  {step.title}
                </p>
                {!isDone && (
                  <p style={{ fontSize: 12, color: isActive ? "#888" : "#555", margin: "3px 0 0", lineHeight: 1.4 }}>
                    {step.hint}
                  </p>
                )}
                {!isDone && step.action && (
                  <button
                    onClick={() => router.push(step.action!)}
                    style={{
                      marginTop: 6, fontSize: 12, fontWeight: 600,
                      color: isActive ? accent : "#555",
                      background: "none", border: "none",
                      cursor: "pointer", padding: 0,
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                    }}
                  >
                    {step.cta}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "4px 18px 14px", borderTop: "1px solid #1e1e1e" }}>
        {allDone && (
          <div style={{
            borderRadius: 10, padding: "10px 14px", textAlign: "center",
            background: "rgba(16,185,129,0.1)", marginBottom: 10, marginTop: 8,
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#10B981", margin: 0 }}>You&apos;re all set! 🎉</p>
            <p style={{ fontSize: 12, color: "#6ee7b7", margin: "3px 0 0" }}>Posthive is ready to post.</p>
          </div>
        )}
        <button
          onClick={dismiss}
          style={{
            width: "100%", fontSize: 12, textAlign: "center", cursor: "pointer",
            background: "none", border: "none", color: "#383838", padding: "6px 0",
            marginTop: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#666")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#383838")}
        >
          Dismiss guide
        </button>
      </div>
    </div>
  );
}
