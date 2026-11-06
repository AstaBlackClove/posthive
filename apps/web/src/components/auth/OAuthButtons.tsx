import { cn } from "../../lib/cn";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const BTN =
  "flex h-12 items-center justify-center rounded-xl border border-neutral-500 px-4 type-body-m-s text-neutral-200 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60";

/** "Continue with Google / LinkedIn". Plain links: the API starts the OAuth redirect. */
export function OAuthButtons({ returnTo, className }: { returnTo?: string | null; className?: string }) {
  const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <a href={`${API_BASE}/auth/google${qs}`} className={BTN}>
        Continue with Google
      </a>
      <a href={`${API_BASE}/auth/linkedin/login${qs}`} className={BTN}>
        Continue with LinkedIn
      </a>
    </div>
  );
}

/** Horizontal rule with a centred label, e.g. "or log in with email". */
export function OrDivider({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <span className="h-px flex-1 bg-neutral-600" />
      <span className="type-body-r-xs text-neutral-300">{children}</span>
      <span className="h-px flex-1 bg-neutral-600" />
    </div>
  );
}
