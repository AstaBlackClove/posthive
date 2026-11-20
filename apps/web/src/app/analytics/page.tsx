"use client";

import { Fragment, useEffect, useState, useCallback, useRef } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { apiFetch } from "../../lib/api";
import { PlatformIcon } from "../../components/PlatformIcon";
import { PLATFORM_COLOR } from "../../components/PlatformPreview";

/* ---------- types (mirror apps/api/src/routes/analytics.ts) ---------- */

interface TargetStats {
  targetId: string;
  platform: string;
  displayName: string;
  likes: number; reposts: number; replies: number; saves: number;
  views: number | null;
  fetchedAt: string;
}

interface PostGroup {
  jobId: string;
  scheduledFor: string | null;
  text: string;
  targets: TargetStats[];
}

interface Totals {
  likes: number; reposts: number; replies: number; saves: number; views: number;
  engagementRate: number;
  postsPublished: number; accountsPosted: number;
}

interface TimeseriesPoint {
  date: string; views: number; likes: number; replies: number; reposts: number; postsPublished: number;
}

interface PlatformBreakdown { platform: string; views: number; pct: number; bestCount: number }
interface HeatmapCell { dayOfWeek: number; bucket: number; bucketLabel: string; avgViews: number; multiplier: number; count: number }

interface AnalyticsResponse {
  range: { days: number; from: string; to: string };
  totals: Totals;
  previousTotals: Omit<Totals, "postsPublished" | "accountsPosted">;
  medianViews: number;
  timeseries: TimeseriesPoint[];
  byPlatform: PlatformBreakdown[];
  heatmap: HeatmapCell[];
  heatmapBuckets: string[];
  posts: PostGroup[];
  lastSyncedAt: string | null;
}

const DAY_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

const METRIC_SERIES = [
  { key: "postsPublished", label: "Posts published", color: "#5b63d3" },
  { key: "views", label: "Views", color: "#22d3ee" },
  { key: "likes", label: "Likes", color: "#ec4899" },
  { key: "replies", label: "Comments", color: "#a78bfa" },
  { key: "reposts", label: "Shares", color: "#22c55e" },
] as const;
type MetricKey = (typeof METRIC_SERIES)[number]["key"];

/* ---------- helpers ---------- */

function numFmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(Math.round(v));
}

function pctChange(now: number, prev: number): number | null {
  if (prev === 0) return now === 0 ? null : 100;
  return ((now - prev) / prev) * 100;
}

function excerpt(text: string, max = 60) {
  const clean = text.replace(/\n+/g, " ").trim();
  return clean.length > max ? `"${clean.slice(0, max)}...` : `"${clean}`;
}

function relDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function syncAgo(iso: string | null) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

/* ---------- stat card ---------- */

function StatCard({ icon, label, value, change, sub }: { icon: React.ReactNode; label: string; value: string; change?: number | null; sub?: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#1a1a2e" }}>{icon}</div>
        <span className="text-xs font-medium" style={{ color: "#888" }}>{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color: "#ededed" }}>{value}</span>
        {change != null && (
          <span className="text-xs font-semibold" style={{ color: change >= 0 ? "#22c55e" : "#ef4444" }}>
            {change >= 0 ? "+" : ""}{change.toFixed(0)}%
          </span>
        )}
      </div>
      {sub && <p className="text-[11px]" style={{ color: "#555" }}>{sub}</p>}
    </div>
  );
}

function Icon({ path }: { path: string }) {
  return <svg className="w-4 h-4" fill="none" stroke="#8c92ff" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} /></svg>;
}

const ICONS = {
  views: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  posts: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  likes: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  comments: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  shares: "M8.684 13.342a3 3 0 100-2.684m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
  saves: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
  engagement: "M13 10V3L4 14h7v7l9-11h-7z",
  accounts: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
};

/* ---------- main ---------- */

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"metrics" | "videos" | "insights">("metrics");
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["postsPublished", "views"]);
  const [sortBy, setSortBy] = useState<"outlier" | "newest">("outlier");
  const [platformFilter, setPlatformFilter] = useState<Set<string>>(new Set());
  const runId = useRef(0);

  const loadAll = useCallback(async (silent = false) => {
    const rid = ++runId.current;
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const res = await apiFetch<AnalyticsResponse>(`/analytics?days=${days}`);
      if (runId.current !== rid) return;
      setData(res);
      setPlatformFilter(new Set()); // reset to "all" on new data
    } catch (e) {
      if (runId.current !== rid) return;
      setError(`Failed to load analytics — ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "#888" }}>
        <div className="flex items-center gap-3">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading analytics…
        </div>
      </div>
    );
  }

  const allPlatforms = Array.from(new Set((data?.posts ?? []).flatMap((p) => p.targets.map((t) => t.platform)))).sort();
  const synced = syncAgo(data?.lastSyncedAt ?? null);

  // Platform filter only narrows the "Every video" table — every other number stays
  // whole-account so the top cards always answer "how is everything doing".
  const togglePlatform = (p: string) => {
    setPlatformFilter((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };
  const platformVisible = (p: string) => platformFilter.size === 0 || platformFilter.has(p);

  const filteredPosts = (data?.posts ?? [])
    .map((p) => ({ ...p, targets: p.targets.filter((t) => platformVisible(t.platform)) }))
    .filter((p) => p.targets.length > 0);

  const viewsForMedian = filteredPosts.flatMap((p) => p.targets.map((t) => t.views)).filter((v): v is number => v != null);
  const sortedViews = [...viewsForMedian].sort((a, b) => a - b);
  const localMedian = sortedViews.length
    ? (sortedViews.length % 2 ? sortedViews[Math.floor(sortedViews.length / 2)] : (sortedViews[sortedViews.length / 2 - 1] + sortedViews[sortedViews.length / 2]) / 2)
    : (data?.medianViews ?? 0);

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === "newest") return (b.scheduledFor ?? "").localeCompare(a.scheduledFor ?? "");
    const bestA = Math.max(0, ...a.targets.map((t) => t.views ?? 0));
    const bestB = Math.max(0, ...b.targets.map((t) => t.views ?? 0));
    return bestB - bestA;
  });

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between pt-10 md:pt-0 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#ededed" }}>Analytics</h1>
            <p className="text-sm mt-0.5" style={{ color: "#555" }}>
              {synced ? `Synced ${synced}` : "Not yet synced"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date range */}
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#ededed" }}>
              {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => loadAll(true)} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: refreshing ? "#555" : "#ededed" }}>
              <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#1a0e0e", border: "1px solid #5a2020", color: "#f87171" }}>{error}</div>
        )}

        {(!data || data.posts.length === 0) && !error ? (
          <div className="rounded-2xl p-12 flex flex-col items-center gap-3 text-center" style={{ border: "1px dashed #2a2a2a" }}>
            <svg className="w-10 h-10" style={{ color: "#333" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="font-semibold" style={{ color: "#555" }}>No stats yet</p>
            <p className="text-sm" style={{ color: "#444" }}>Stats sync every 6h for posts on Bluesky, Mastodon, Threads, Instagram, Facebook, or YouTube.</p>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={<Icon path={ICONS.views} />} label="Views" value={numFmt(data!.totals.views)}
                change={pctChange(data!.totals.views, data!.previousTotals.views)} sub="all accounts" />
              <StatCard icon={<Icon path={ICONS.posts} />} label="Posts published" value={String(data!.totals.postsPublished)}
                sub={`${data!.totals.accountsPosted} accounts`} />
              <StatCard icon={<Icon path={ICONS.likes} />} label="Likes" value={numFmt(data!.totals.likes)}
                change={pctChange(data!.totals.likes, data!.previousTotals.likes)} />
              <StatCard icon={<Icon path={ICONS.comments} />} label="Comments" value={numFmt(data!.totals.replies)}
                change={pctChange(data!.totals.replies, data!.previousTotals.replies)} />
              <StatCard icon={<Icon path={ICONS.shares} />} label="Shares" value={numFmt(data!.totals.reposts)}
                change={pctChange(data!.totals.reposts, data!.previousTotals.reposts)} />
              <StatCard icon={<Icon path={ICONS.saves} />} label="Saves" value={numFmt(data!.totals.saves)}
                change={pctChange(data!.totals.saves, data!.previousTotals.saves)} sub="Instagram only" />
              <StatCard icon={<Icon path={ICONS.engagement} />} label="Engagement rate" value={`${data!.totals.engagementRate.toFixed(1)}%`}
                change={pctChange(data!.totals.engagementRate, data!.previousTotals.engagementRate)} />
              <StatCard icon={<Icon path={ICONS.accounts} />} label="Accounts" value={String(data!.totals.accountsPosted)}
                sub="posted to in this range" />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
              {([["metrics", "Metrics"], ["videos", "Every video"], ["insights", "Insights"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={tab === key ? { backgroundColor: "#fff", color: "#0a0a0a" } : { color: "#888" }}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "metrics" && (
              <div className="rounded-2xl p-5" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <span className="text-sm font-semibold" style={{ color: "#ededed" }}>Metrics</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {METRIC_SERIES.map((m) => {
                      const active = activeMetrics.includes(m.key);
                      return (
                        <button key={m.key} onClick={() => setActiveMetrics((prev) => active ? prev.filter((k) => k !== m.key) : [...prev, m.key])}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                          style={active ? { backgroundColor: `${m.color}20`, color: m.color, border: `1px solid ${m.color}50` } : { backgroundColor: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? m.color : "#444" }} />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={data!.timeseries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString([], { month: "short", day: "numeric" })} tick={{ fill: "#666", fontSize: 11 }} />
                    {/* Views runs in the hundreds/thousands while likes/comments/shares run in the
                        tens — sharing one axis flattens the smaller series to near-invisible, so
                        views gets its own right-hand axis. */}
                    <YAxis yAxisId="left" tick={{ fill: "#666", fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "#22d3ee", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(d) => new Date(d).toLocaleDateString([], { month: "short", day: "numeric" })} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {METRIC_SERIES.filter((m) => activeMetrics.includes(m.key)).map((m) =>
                      m.key === "postsPublished"
                        ? <Bar key={m.key} yAxisId="left" dataKey={m.key} name={m.label} fill={m.color} opacity={0.5} radius={[3, 3, 0, 0]} />
                        : <Line key={m.key} yAxisId={m.key === "views" ? "right" : "left"} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2} dot={false} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {tab === "videos" && (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
                <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-3" style={{ borderBottom: "1px solid #1f1f1f" }}>
                  <span className="text-sm" style={{ color: "#888" }}>
                    Every post, every platform · <span style={{ color: "#5b63d3" }}>1.0x = your median post ({numFmt(localMedian)} views)</span>
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Platform filter — scoped to this tab only, so it never looks like it should affect the stat cards above */}
                    <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                      {allPlatforms.map((p) => (
                        <button key={p} type="button" onClick={() => togglePlatform(p)}
                          title={`Filter: ${p}`}
                          className="w-6 h-6 rounded-md flex items-center justify-center transition-opacity"
                          style={{ opacity: platformVisible(p) ? 1 : 0.3, backgroundColor: platformFilter.has(p) ? "#1a1a2e" : "transparent" }}>
                          <PlatformIcon platform={p} size={13} />
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {([["outlier", "Outlier score"], ["newest", "Newest"]] as const).map(([key, label]) => (
                        <button key={key} onClick={() => setSortBy(key)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={sortBy === key ? { backgroundColor: "#1a1a2e", color: "#8c92ff", border: "1px solid #5b63d350" } : { backgroundColor: "transparent", color: "#666", border: "1px solid transparent" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-[#1f1f1f] overflow-y-auto" style={{ maxHeight: "55vh" }}>
                  {sortedPosts.length === 0 && (
                    <p className="text-sm text-center py-10" style={{ color: "#555" }}>No posts match this filter.</p>
                  )}
                  {sortedPosts.map((p) => {
                    const byPlatform = new Map(p.targets.map((t) => [t.platform, t]));
                    const totalViews = p.targets.reduce((s, t) => s + (t.views ?? 0), 0);
                    const bestViews = Math.max(0, ...p.targets.map((t) => t.views ?? 0));
                    const outlier = localMedian > 0 ? bestViews / localMedian : 0;
                    // Dedupe to distinct platforms (a post can go to many same-platform accounts —
                    // beardtricks posts to 14 Facebook pages at once) and cap the icon stack so one
                    // heavy post doesn't crowd the row.
                    const postPlatforms = Array.from(new Set(p.targets.map((t) => t.platform)));
                    const shownPlatforms = postPlatforms.slice(0, 3);
                    const extraPlatforms = postPlatforms.length - shownPlatforms.length;
                    return (
                      <div key={p.jobId} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {shownPlatforms.map((plat) => <PlatformIcon key={plat} platform={plat} size={14} />)}
                            {extraPlatforms > 0 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", color: "#888" }}>+{extraPlatforms}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" style={{ color: "#ededed" }}>{excerpt(p.text)}</p>
                            <div className="flex items-center gap-2 text-[11px] mt-0.5" style={{ color: "#555" }}>
                              <span>{relDate(p.scheduledFor)}</span>
                              {outlier > 0 && <span style={{ color: outlier >= 2 ? "#22c55e" : outlier < 0.5 ? "#ef4444" : "#888" }}>{outlier.toFixed(1)}x</span>}
                            </div>
                          </div>
                          <span className="sm:hidden text-sm font-semibold flex-shrink-0" style={{ color: "#ededed" }}>{numFmt(totalViews)}</span>
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0" style={{ scrollbarWidth: "none" }}>
                          {allPlatforms.filter(platformVisible).map((plat) => {
                            const t = byPlatform.get(plat);
                            const v = t?.views;
                            const pct = v != null && localMedian > 0 ? Math.min(100, (v / (localMedian * 3)) * 100) : 0;
                            return (
                              <div key={plat} className="w-20 sm:w-24 flex-shrink-0">
                                <div className="flex items-center gap-1.5 text-xs mb-1">
                                  <PlatformIcon platform={plat} size={10} />
                                  <span style={{ color: v != null ? "#ccc" : "#444" }}>{v != null ? numFmt(v) : "—"}</span>
                                </div>
                                <div className="h-1 rounded-full" style={{ backgroundColor: "#1f1f1f" }}>
                                  {v != null && <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: PLATFORM_COLOR[plat] ?? "#5b63d3" }} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="hidden sm:block w-14 text-right flex-shrink-0">
                          <span className="text-sm font-semibold" style={{ color: "#ededed" }}>{numFmt(totalViews)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "insights" && (
              <div className="grid md:grid-cols-2 gap-5">
                <div className="rounded-2xl p-5" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
                  <p className="text-sm font-semibold mb-4" style={{ color: "#ededed" }}>By platform</p>
                  <div className="space-y-4">
                    {data!.byPlatform.map((pb) => (
                      <div key={pb.platform}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={pb.platform} size={14} />
                            <span className="text-sm font-medium capitalize" style={{ color: "#ededed" }}>{pb.platform}</span>
                          </div>
                          <span className="text-sm font-semibold" style={{ color: "#ededed" }}>{numFmt(pb.views)}</span>
                        </div>
                        <div className="h-1.5 rounded-full mb-1" style={{ backgroundColor: "#1f1f1f" }}>
                          <div className="h-full rounded-full" style={{ width: `${pb.pct}%`, backgroundColor: PLATFORM_COLOR[pb.platform] ?? "#5b63d3" }} />
                        </div>
                        <p className="text-[11px]" style={{ color: "#555" }}>{pb.pct.toFixed(0)}% of views · best on {pb.bestCount} of {data!.posts.length} posts</p>
                      </div>
                    ))}
                    {data!.byPlatform.length === 0 && <p className="text-sm" style={{ color: "#555" }}>No view data yet.</p>}
                  </div>
                </div>

                <div className="rounded-2xl p-5" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#ededed" }}>When your posts do best</p>
                  <p className="text-[11px] mb-4" style={{ color: "#555" }}>UTC time · darker = more views than your average</p>
                  <Heatmap cells={data!.heatmap} buckets={data!.heatmapBuckets} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- heatmap ---------- */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Heatmap({ cells, buckets }: { cells: HeatmapCell[]; buckets: string[] }) {
  const map = new Map(cells.map((c) => [`${c.dayOfWeek}:${c.bucket}`, c]));
  const maxMultiplier = Math.max(1, ...cells.map((c) => c.multiplier));
  const best = [...cells].sort((a, b) => b.multiplier - a.multiplier)[0];

  function colorFor(mult: number) {
    const t = Math.min(1, mult / maxMultiplier);
    const alpha = 0.08 + t * 0.72;
    return `rgba(91, 99, 211, ${alpha})`;
  }

  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `36px repeat(${buckets.length}, 1fr)` }}>
        <div />
        {buckets.map((b) => (
          <div key={b} className="text-[9px] text-center" style={{ color: "#555" }}>{b}</div>
        ))}
        {DAY_LABELS.map((day, dayIdx) => (
          <Fragment key={day}>
            <div className="text-[10px] flex items-center" style={{ color: "#888" }}>{day}</div>
            {buckets.map((_, bucketIdx) => {
              const cell = map.get(`${dayIdx}:${bucketIdx}`);
              return (
                <div key={`${day}-${bucketIdx}`} className="aspect-square rounded-md"
                  style={{ backgroundColor: cell ? colorFor(cell.multiplier) : "#161616" }}
                  title={cell ? `${numFmt(cell.avgViews)} avg views · ${cell.multiplier.toFixed(1)}x` : "No data"}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      {best && best.multiplier > 1 && (
        <p className="text-[11px] mt-3" style={{ color: "#888" }}>
          {DAY_LABELS[best.dayOfWeek]} {best.bucketLabel} averaged <span style={{ color: "#5b63d3", fontWeight: 600 }}>{best.multiplier.toFixed(1)}×</span> your usual views. Based on {best.count} posts.
        </p>
      )}
    </div>
  );
}
