"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer, BarChart, LineChart,
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { apiFetch } from "../../lib/api";
import { PlatformIcon } from "../../components/PlatformIcon";

/* ---------- types ---------- */

interface TargetStats {
  targetId: string;
  platform: string;
  displayName: string;
  likes: number;
  reposts: number;
  replies: number;
  views: number | null;
  fetchedAt: string;
}

interface PostGroup {
  jobId: string;
  scheduledFor: string | null;
  text: string;
  targets: TargetStats[];
}

interface AnalyticsResponse {
  totals: { likes: number; reposts: number; replies: number; posts: number };
  posts: PostGroup[];
  lastSyncedAt: string | null;
}

interface ChartPoint {
  week: string;
  Likes: number;
  Reposts: number;
  Replies: number;
}

/* ---------- constants ---------- */

const PAGE_SIZE = 10;

const PLATFORM_LABEL: Record<string, string> = {
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  pixelfed: "Pixelfed",
};

const SERIES = [
  { key: "Likes",   color: "#5b63d3" },
  { key: "Reposts", color: "#22d3ee" },
  { key: "Replies", color: "#a78bfa" },
] as const;

/* ---------- helpers ---------- */

function numFmt(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
}

function excerpt(text: string, max = 90) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function relDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 30) return `${diff}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function syncAgo(iso: string | null) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

/** Bucket posts into ISO-week groups for the chart */
function toWeekBuckets(groups: PostGroup[]): ChartPoint[] {
  const map = new Map<string, ChartPoint>();
  for (const g of groups) {
    if (!g.scheduledFor) continue;
    const d = new Date(g.scheduledFor);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const key = monday.toLocaleDateString([], { month: "short", day: "numeric" });
    if (!map.has(key)) map.set(key, { week: key, Likes: 0, Reposts: 0, Replies: 0 });
    const b = map.get(key)!;
    for (const t of g.targets) { b.Likes += t.likes; b.Reposts += t.reposts; b.Replies += t.replies; }
  }
  // Sort by original date order (insertion order is already chronological after sort)
  return Array.from(map.values());
}

/* ---------- sub-components ---------- */

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#888" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: "#ededed" }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: "#555" }}>{sub}</p>}
    </div>
  );
}

function StatCell({ targets, statKey }: { targets: TargetStats[]; statKey: "likes" | "reposts" | "replies" }) {
  if (targets.length === 1) {
    return <span className="text-sm font-medium text-right block" style={{ color: "#ccc" }}>{numFmt(targets[0][statKey])}</span>;
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      {targets.map((t) => (
        <div key={t.targetId} className="flex items-center gap-1">
          <PlatformIcon platform={t.platform} size={11} />
          <span className="text-xs font-medium" style={{ color: "#ccc" }}>{numFmt(t[statKey])}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- chart toggle button ---------- */

function ChartTypeBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
      style={active
        ? { backgroundColor: "#5b63d3", color: "#fff" }
        : { backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#666" }}
    >
      {label}
    </button>
  );
}

/* ---------- main ---------- */

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [platform, setPlatform] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [page, setPage] = useState(0);
  const runId = useRef(0);

  const loadAll = useCallback(async (silent = false) => {
    const rid = ++runId.current;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await apiFetch<AnalyticsResponse>("/analytics");
      if (runId.current !== rid) return;
      setData(res);
    } catch (e) {
      if (runId.current !== rid) return;
      setError(`Failed to load analytics — ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* reset page when filter changes */
  useEffect(() => { setPage(0); }, [platform]);

  /* filtered groups */
  const allPlatforms = Array.from(
    new Set((data?.posts ?? []).flatMap((g) => g.targets.map((t) => t.platform)))
  ).sort();

  const visibleGroups = (data?.posts ?? [])
    .map((g) => ({
      ...g,
      targets: platform === "all" ? g.targets : g.targets.filter((t) => t.platform === platform),
    }))
    .filter((g) => g.targets.length > 0);

  /* totals */
  let likes = 0, reposts = 0, replies = 0;
  for (const g of visibleGroups) for (const t of g.targets) { likes += t.likes; reposts += t.reposts; replies += t.replies; }

  /* chart data */
  const chartData = toWeekBuckets(visibleGroups);

  /* pagination */
  const totalPages = Math.ceil(visibleGroups.length / PAGE_SIZE);
  const pageGroups = visibleGroups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* ---------- render ---------- */

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

  const synced = syncAgo(data?.lastSyncedAt ?? null);

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Header — pt-12 on mobile pushes below fixed hamburger */}
        <div className="flex items-center justify-between pt-10 md:pt-0">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#ededed" }}>Analytics</h1>
            <p className="text-sm mt-0.5" style={{ color: "#555" }}>
              Engagement stats · last 90 days{synced && ` · synced ${synced}`}
            </p>
          </div>
          <button
            onClick={() => loadAll(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: refreshing ? "#555" : "#ededed" }}
          >
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#1a0e0e", border: "1px solid #5a2020", color: "#f87171" }}>
            {error}
          </div>
        )}

        {(!data || data.posts.length === 0) && !error ? (
          <div className="rounded-2xl p-12 flex flex-col items-center gap-3 text-center" style={{ border: "1px dashed #2a2a2a" }}>
            <svg className="w-10 h-10" style={{ color: "#333" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="font-semibold" style={{ color: "#555" }}>No stats yet</p>
            <p className="text-sm" style={{ color: "#444" }}>
              Stats sync every 6h for posts on Bluesky, Mastodon, or Pixelfed.<br />
              First sync runs at startup check back shortly.
            </p>
          </div>
        ) : (
          <>
            {/* Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Tile label="Total Likes" value={numFmt(likes)} sub={`${visibleGroups.length} post${visibleGroups.length !== 1 ? "s" : ""}`} />
              <Tile label="Reposts" value={numFmt(reposts)} />
              <Tile label="Replies" value={numFmt(replies)} />
              <Tile label="Posts Tracked" value={data?.totals.posts ?? 0} sub="synced every 6h" />
            </div>

            {/* Platform filter */}
            {allPlatforms.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {["all", ...allPlatforms].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                    style={platform === p
                      ? { backgroundColor: "#5b63d3", color: "#fff" }
                      : { backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888" }}
                  >
                    {p !== "all" && <PlatformIcon platform={p} size={14} />}
                    {p === "all" ? "All platforms" : PLATFORM_LABEL[p] ?? p}
                  </button>
                ))}
              </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: "#ededed" }}>Engagement over time</p>
                  <div className="flex gap-1">
                    <ChartTypeBtn active={chartType === "bar"} label="Bar" onClick={() => setChartType("bar")} />
                    <ChartTypeBtn active={chartType === "line"} label="Line" onClick={() => setChartType("line")} />
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  {chartType === "bar" ? (
                    <BarChart data={chartData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                      <XAxis dataKey="week" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, color: "#ededed", fontSize: 12 }}
                        cursor={{ fill: "#ffffff08" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                      {SERIES.map((s) => <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={32} />)}
                    </BarChart>
                  ) : (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                      <XAxis dataKey="week" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, color: "#ededed", fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                      {SERIES.map((s) => (
                        <Line key={s.key} dataKey={s.key} stroke={s.color} strokeWidth={2}
                          dot={{ r: 3, fill: s.color }} activeDot={{ r: 5 }} />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            {/* Posts table */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
              <div className="overflow-x-auto">
              <div style={{ minWidth: 580 }}>
              <div
                className="grid text-xs font-semibold uppercase tracking-wide px-5 py-3"
                style={{
                  gridTemplateColumns: "1fr 100px 70px 70px 70px 80px",
                  backgroundColor: "#0e0e0e",
                  borderBottom: "1px solid #2a2a2a",
                  color: "#555",
                }}
              >
                <span>Post</span>
                <span>Platforms</span>
                <span className="text-right">Likes</span>
                <span className="text-right">Reposts</span>
                <span className="text-right">Replies</span>
                <span className="text-right">Posted</span>
              </div>

              {pageGroups.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm" style={{ color: "#555" }}>No posts yet.</div>
              ) : (
                pageGroups.map((group, i) => {
                  const multi = group.targets.length > 1;
                  return (
                    <div
                      key={group.jobId}
                      className="grid px-5 py-4"
                      style={{
                        gridTemplateColumns: "1fr 100px 70px 70px 70px 80px",
                        borderBottom: i < pageGroups.length - 1 ? "1px solid #1e1e1e" : "none",
                        alignItems: multi ? "start" : "center",
                      }}
                    >
                      <div className="min-w-0 pr-4 pt-0.5 overflow-hidden">
                        <span className="text-sm block truncate" title={group.text} style={{ color: group.text ? "#ccc" : "#444" }}>
                          {group.text ? excerpt(group.text) : "(no text)"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {group.targets.map((t) => <PlatformIcon key={t.targetId} platform={t.platform} size={15} />)}
                      </div>
                      <StatCell targets={group.targets} statKey="likes" />
                      <StatCell targets={group.targets} statKey="reposts" />
                      <StatCell targets={group.targets} statKey="replies" />
                      <span className="text-xs text-right pt-0.5" style={{ color: "#555" }}>{relDate(group.scheduledFor)}</span>
                    </div>
                  );
                })
              )}

              </div>{/* end minWidth */}
              </div>{/* end overflow-x-auto */}

              {/* Pagination — outside scroll wrapper, inside card */}
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderTop: "1px solid #2a2a2a", backgroundColor: "#0e0e0e" }}
                >
                  <span className="text-xs" style={{ color: "#555" }}>
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, visibleGroups.length)} of {visibleGroups.length}
                  </span>
                  <div className="flex gap-1">
                    <PaginationBtn label="←" disabled={page === 0} onClick={() => setPage((p) => p - 1)} />
                    {Array.from({ length: totalPages }, (_, i) => (
                      <PaginationBtn key={i} label={String(i + 1)} active={i === page} onClick={() => setPage(i)} />
                    ))}
                    <PaginationBtn label="→" disabled={page === totalPages - 1} onClick={() => setPage((p) => p + 1)} />
                  </div>
                </div>
              )}
            </div>

            {/* Coming soon */}
            <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ backgroundColor: "#0f0f1a", border: "1px solid #2a2a40" }}>
              <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#5b63d3" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium" style={{ color: "#8b8fde" }}>More platforms coming soon</p>
                <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                  Threads, Instagram, LinkedIn, YouTube, Facebook, X/Twitter, and Pinterest analytics pending platform API approvals.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- pagination button ---------- */

function PaginationBtn({ label, active, disabled, onClick }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors"
      style={
        active
          ? { backgroundColor: "#5b63d3", color: "#fff" }
          : disabled
          ? { color: "#333", cursor: "default" }
          : { color: "#666", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }
      }
    >
      {label}
    </button>
  );
}
