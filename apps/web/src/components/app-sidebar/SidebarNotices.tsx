"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/components/Toast";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Shown to a person whose email address is not verified yet. */
export function VerifyEmailNotice() {
  const { success, error } = useToast();
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/resend-verification`, { method: "POST", credentials: "include" });
      if (res.ok) {
        success("Verification email sent — check your inbox.");
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        error(d.error ?? "Failed to send email. Try again.");
      }
    } catch {
      error("Failed to send email. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <InlineAlert tone="warning" title="Verify your email" icon={null} className="text-sidebar-foreground">
      <p className="mb-1.5 type-body-r-xs">Check your inbox for a verification link.</p>
      <Button variant="link" size="sm" onClick={() => void resend()} disabled={sending}>
        {sending ? "Sending…" : "Resend email"}
      </Button>
    </InlineAlert>
  );
}

const WHATS_NEW_KEY = "ph:dismissed:repeat-posts";

/** A one-time "what's new" card; dismissing it is remembered in this browser. */
export function WhatsNewCard() {
  const [dismissed, setDismissed] = useState(true); // hidden until we know, so it does not flash

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(WHATS_NEW_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(WHATS_NEW_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative rounded-xl border border-brand-300 bg-brand-100 px-3 py-2.5">
      <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={dismiss} className="absolute top-1.5 right-1.5 size-6 text-neutral-500">
        <XIcon className="size-3" />
      </Button>
      <p className="mb-1 type-body-sb-xxs tracking-widest text-brand-800 uppercase">New</p>
      <p className="mb-0.5 type-body-sb-xs text-fg">Repeat post scheduling</p>
      <p className="mb-2 type-body-r-xs text-muted">Schedule posts to repeat daily, weekly, or monthly. Set an end date and let it run.</p>
      <Link href="/compose" className="type-body-sb-xs text-brand-800 transition-opacity hover:opacity-80">
        Try it →
      </Link>
    </div>
  );
}
