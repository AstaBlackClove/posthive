"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

const DISMISS_KEY = "ph_ob_done";
const COLLAPSE_KEY = "ph_ob_collapsed";

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
        className={cn(
          "fixed bottom-21 right-6 z-50 flex cursor-pointer items-center gap-2.5 rounded-2xl border border-brand-300 bg-surface px-4 py-2.5 shadow-lg",
          animating && "animate-[ph-slide-up_0.28s_cubic-bezier(.32,1.2,.42,1)_both]",
        )}
      >
        <div className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full",
          allDone ? "bg-green-500 text-white" : "bg-accent text-accent-fg",
        )}>
          <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="type-body-sb-s text-fg">Getting started</span>
        <span className={cn(
          "rounded-full px-2 py-0.5 type-body-sb-xs",
          allDone ? "bg-green-50 text-green-700" : "bg-brand-100 text-brand-800",
        )}>
          {completedCount}/{total}
        </span>
        {/* Expand chevron */}
        <svg width="12" height="12" fill="none" viewBox="0 0 12 12" className="ml-0.5 text-neutral-500">
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
    <div className={cn(
      "card fixed bottom-21 right-6 z-50 w-75 overflow-hidden shadow-xl",
      animating && "animate-[ph-slide-down_0.3s_cubic-bezier(.32,1.2,.42,1)_both]",
    )}>
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
      <div className="flex items-center justify-between border-b border-border px-4.5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="type-body-sb-s text-fg">Getting started</span>
          <span className={cn(
            "rounded-full px-2 py-0.5 type-body-sb-xs",
            allDone ? "bg-green-50 text-green-700" : "bg-brand-100 text-brand-800",
          )}>
            {completedCount}/{total}
          </span>
        </div>
        <button
          onClick={() => toggleCollapse(true)}
          className="cursor-pointer rounded-md p-1.5 text-neutral-500 hover:text-muted"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 12 12">
            <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-neutral-100">
        <div
          className={cn(
            "h-full w-(--w) rounded-r-xs transition-[width] duration-500",
            allDone ? "bg-green-500" : "bg-accent",
          )}
          style={{ "--w": `${(completedCount / total) * 100}%` } as React.CSSProperties}
        />
      </div>

      {/* Steps */}
      <div ref={bodyRef} className="flex flex-col gap-1.5 px-4.5 py-4">
        {STEPS.map((step) => {
          const isDone = done[step.id];
          const isActive = step.id === activeStepId;
          return (
            <div key={step.id} className={cn(
              "flex items-start gap-3 rounded-xl border-2 px-3 py-2.5 transition-all duration-200",
              isActive ? "border-brand-300 bg-brand-100" : isDone ? "border-transparent" : "border-transparent bg-bg",
            )}>
              {/* Circle */}
              <div className={cn(
                "mt-px flex size-5.5 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                isDone ? "bg-green-500 text-white" : isActive ? "border-2 border-accent bg-brand-200 ring-3 ring-brand-200" : "border-2 border-neutral-300",
              )}>
                {isDone && (
                  <svg width="11" height="11" fill="none" viewBox="0 0 10 10">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isActive && !isDone && (
                  <div className="size-1.5 rounded-full bg-accent" />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className={cn(
                  isActive ? "type-body-sb-s" : "type-body-m-s",
                  isDone ? "text-neutral-500 line-through" : isActive ? "text-fg" : "text-muted",
                )}>
                  {step.title}
                </p>
                {!isDone && (
                  <p className={cn("mt-0.5 type-body-r-xs", isActive ? "text-muted" : "text-neutral-500")}>
                    {step.hint}
                  </p>
                )}
                {!isDone && step.action && (
                  <button
                    onClick={() => router.push(step.action!)}
                    className={cn(
                      "mt-1.5 cursor-pointer type-body-sb-xs underline underline-offset-2",
                      isActive ? "text-brand-800" : "text-neutral-500",
                    )}
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
      <div className="border-t border-border px-4.5 pt-1 pb-3.5">
        {allDone && (
          <div className="mt-2 mb-2.5 rounded-xl bg-green-50 px-3.5 py-2.5 text-center">
            <p className="type-body-sb-s text-green-700">You&apos;re all set! 🎉</p>
            <p className="mt-0.5 type-body-r-xs text-green-700">Posthive is ready to post.</p>
          </div>
        )}
        <button
          onClick={dismiss}
          className="mt-1 w-full cursor-pointer py-1.5 text-center type-body-r-xs text-neutral-500 hover:text-muted"
        >
          Dismiss guide
        </button>
      </div>
    </div>
  );
}
