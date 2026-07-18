// Client-side tracking — fires only when NEXT_PUBLIC_ENABLE_ANALYTICS=true
// Anonymous sessions: one row per browser session, updated as user navigates
// Conversion events: logged-in users only, key actions

const ENABLED = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Visitor ID ────────────────────────────────────────────────────────────────

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("ph_vid");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("ph_vid", id);
  }
  return id;
}

// ── Session state (in-memory, flushed to API) ─────────────────────────────────

interface SessionState {
  visitorId: string;
  entry: string;
  pages: string[];
  referrer: string;
  startedAt: number;
  converted: boolean;
}

let session: SessionState | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getSession(): SessionState {
  if (!session) {
    session = {
      visitorId: getVisitorId(),
      entry: window.location.pathname,
      pages: [window.location.pathname],
      referrer: document.referrer,
      startedAt: Date.now(),
      converted: false,
    };
  }
  return session;
}

async function flushSession(exit?: string) {
  if (!ENABLED || !session) return;
  const s = session;
  const duration = Math.round((Date.now() - s.startedAt) / 1000);

  try {
    await fetch(`${API}/track/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        visitorId: s.visitorId,
        entry: s.entry,
        pages: s.pages,
        exit: exit ?? s.pages[s.pages.length - 1],
        referrer: s.referrer || undefined,
        duration,
        converted: s.converted,
      }),
      keepalive: true, // survives tab close
    });
  } catch { /* fire-and-forget */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Call on every route change */
export function trackPageView(path: string) {
  if (!ENABLED || typeof window === "undefined") return;
  const s = getSession();
  if (s.pages[s.pages.length - 1] !== path) {
    s.pages.push(path);
  }

  // Debounced flush — writes to DB after 2s of no navigation
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flushSession(), 2000);
}

/** Call when trial starts (sets converted=true) */
export function trackConversion() {
  if (!ENABLED || typeof window === "undefined") return;
  const s = getSession();
  s.converted = true;
  flushSession();
}

/** Log a conversion event for logged-in users */
export async function trackEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (!ENABLED) return;
  try {
    await fetch(`${API}/track/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ event, properties }),
    });
  } catch { /* fire-and-forget */ }
}

/** Wire up tab-close flush — call once in root layout */
export function initTracking() {
  if (!ENABLED || typeof window === "undefined") return;
  getSession(); // init session on first load

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushSession(window.location.pathname);
    }
  });
}
