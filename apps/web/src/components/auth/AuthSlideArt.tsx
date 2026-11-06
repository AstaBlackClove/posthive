import { BRAND } from "../../lib/brand";
import { cn } from "../../lib/cn";

// Static, decorative product illustrations for the auth slider. All sample data, no network.
// Sizes follow the Figma frame (1440 wide) so the cards overlap the way the design shows.

const CARD = "absolute rounded-2xl bg-white shadow-xl shadow-neutral-900/15";

function StatusPill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 type-body-m-xxs text-green-700">
      <span className="size-1.5 rounded-full bg-green-500" />
      {children}
    </span>
  );
}

// ── Slide 1: Plan ───────────────────────────────────────────────────────────

// . empty day · Y planned · D today
const CALENDAR = ["..Y..Y.", "..YD..Y", "..Y..Y.", "..YY.Y."];
const DAY = { ".": "bg-neutral-50", Y: "bg-brand-500", D: "bg-neutral-700" } as const;

export function PlanArt() {
  return (
    <div className="relative h-49 w-123" aria-hidden="true">
      <div className={cn(CARD, "top-0 left-0 w-60 p-5")}>
        <p className="type-body-sb-xs text-neutral-950">November 2026</p>
        <div className="mt-3 grid grid-cols-7 gap-[5px]">
          {CALENDAR.flatMap((row, r) =>
            [...row].map((c, i) => (
              <span key={`${r}-${i}`} className={cn("size-6 rounded-md", DAY[c as keyof typeof DAY])} />
            )),
          )}
        </div>
      </div>

      <div className={cn(CARD, "top-23 left-47 w-75.5 p-5")}>
        <p className="flex items-baseline gap-2 text-neutral-950">
          <span className="type-body-m-xl">42</span>
          <span className="type-body-r-xs text-neutral-600">/ 60 posts planned · Q4 2026</span>
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-50">
          <div className="h-full w-[70%] rounded-full bg-brand-500" />
        </div>
      </div>
    </div>
  );
}

// ── Slide 2: Review ─────────────────────────────────────────────────────────

export function ReviewArt() {
  return (
    <div className="relative h-45 w-106" aria-hidden="true">
      <div className={cn(CARD, "top-0 left-0 flex w-75 items-center gap-4 p-4")}>
        <span className="size-12 shrink-0 rounded-lg bg-neutral-50" />
        <div className="min-w-0 flex-1">
          <p className="type-body-sb-s text-neutral-950">Review caption · 10:00</p>
          <p className="type-body-r-xs text-neutral-600">Carousel, 5 slides</p>
          <div className="mt-1">
            <StatusPill>Approved</StatusPill>
          </div>
        </div>
        {/* LinkedIn mark: platform-native colour */}
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0a66c2] type-body-sb-s text-white">
          in
        </span>
      </div>

      <div className={cn(CARD, "top-30 left-47 flex w-59 items-center gap-3 p-4")}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 type-body-sb-xs text-brand-500">
          R
        </span>
        <div className="min-w-0">
          <p className="type-body-sb-xs text-neutral-950">Rara · Manager</p>
          <p className="type-body-r-xs text-neutral-600">Love this hook — approved!</p>
        </div>
      </div>
    </div>
  );
}

// ── Slide 3: Publish ────────────────────────────────────────────────────────

const BARS = ["h-7", "h-10", "h-9", "h-13", "h-12", "h-17", "h-18"];

function InstagramMark() {
  // Platform-native gradient, drawn locally so the public login page makes no third-party requests.
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="white" />
      </svg>
    </span>
  );
}

export function PublishArt() {
  return (
    <div className="relative h-62 w-120" aria-hidden="true">
      <div className={cn(CARD, "top-0 left-55 flex w-65 items-center gap-3 p-4")}>
        <InstagramMark />
        <div className="min-w-0 flex-1">
          <p className="type-body-sb-xs text-neutral-950">Instagram</p>
          <p className="type-body-r-xs text-neutral-600">@{BRAND.slug}.studio</p>
        </div>
        <StatusPill>Connected</StatusPill>
      </div>

      <div className={cn(CARD, "top-23 left-0 w-63 p-5")}>
        <p className="flex items-baseline gap-2 text-neutral-950">
          <span className="type-body-m-xl">12.4k</span>
          <span className="type-body-r-xs text-neutral-600">reach · last 7 days</span>
          <span className="type-body-r-xs text-neutral-600">▲ 18%</span>
        </p>
        <div className="mt-4 flex h-18 items-end gap-2.5">
          {BARS.map((h, i) => (
            <span
              key={h + i}
              className={cn("w-5 rounded-md", h, i === BARS.length - 1 ? "bg-neutral-700" : "bg-brand-500")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
