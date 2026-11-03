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

  // Centered with inset-x-4 + mx-auto + max-w-140 (= min(560px, 100vw - 32px)),
  // so the slide-up keyframes only animate translateY.
  return (
    <div className="card fixed inset-x-4 bottom-6 z-9999 mx-auto flex max-w-140 animate-[slideUp_0.25s_ease] items-center justify-between gap-3 px-4 py-3.5 shadow-lg">
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="min-w-0">
        <p className="mb-0.5 truncate type-body-sb-s text-fg">
          Schedule posts across 15 platforms
        </p>
        <p className="type-body-r-xs text-muted">
          14-day free trial · no credit card
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/register" className="btn-primary whitespace-nowrap">
          Start free →
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="cursor-pointer px-1.5 py-1 type-body-r-l text-muted transition-colors hover:text-fg"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
