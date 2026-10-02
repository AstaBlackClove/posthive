"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { PlatformIcon } from "../../components/PlatformIcon";
import { useToast } from "../../components/Toast";

const BG = "#0a0a0a";
const SURFACE = "#111111";
const BORDER = "#2a2a2a";
const TEXT = "#ededed";
const MUTED = "#888888";
const ACCENT = "#5b63d3";

const PLATFORM_BRAND: Record<string, string> = {
  bluesky: "#0085ff", threads: "#1a1a1a", linkedin: "#0077b5",
  mastodon: "#6364ff", pixelfed: "#ff8c00", youtube: "#ff0000",
  facebook: "#1877f2", pinterest: "#e60023", telegram: "#229ED9",
  nostr: "#8B5CF6", twitter: "#000000", instagram: "#e1306c",
  tumblr: "#35465c", lemmy: "#ff6314", googlebusiness: "#4285f4",
  tiktok: "#010101", discord: "#5865f2",
};

interface Account {
  id: string;
  platform: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Group {
  id: string;
  name: string;
  accountIds: string[];
}

export default function GroupsPage() {
  const { success, error: toastError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<Account[]>("/accounts").catch(() => [] as Account[]),
      apiFetch<Group[]>("/account-groups").catch(() => [] as Group[]),
    ]).then(([accs, grps]) => {
      setAccounts(accs);
      setGroups(grps);
      setLoading(false);
    });
  }, []);

  async function createGroup() {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      const g = await apiFetch<Group>("/account-groups", {
        method: "POST",
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      setGroups(prev => [...prev, g]);
      setNewGroupName("");
      success("Group created");
    } catch { toastError("Failed to create group"); }
    finally { setCreating(false); }
  }

  async function toggleMember(groupId: string, accountId: string) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const newIds = group.accountIds.includes(accountId)
      ? group.accountIds.filter(id => id !== accountId)
      : [...group.accountIds, accountId];
    try {
      const updated = await apiFetch<Group>(`/account-groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ accountIds: newIds }),
      });
      setGroups(prev => prev.map(g => g.id === groupId ? updated : g));
    } catch { toastError("Failed to update group"); }
  }

  async function renameGroup(groupId: string) {
    if (!editGroupName.trim()) return;
    try {
      const updated = await apiFetch<Group>(`/account-groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editGroupName.trim() }),
      });
      setGroups(prev => prev.map(g => g.id === groupId ? updated : g));
      setEditingGroup(null);
      success("Group renamed");
    } catch { toastError("Failed to rename group"); }
  }

  async function deleteGroup(groupId: string) {
    try {
      await apiFetch(`/account-groups/${groupId}`, { method: "DELETE" });
      setGroups(prev => prev.filter(g => g.id !== groupId));
      success("Group deleted");
    } catch { toastError("Failed to delete group"); }
  }

  function brandColor(platform: string) {
    const b = PLATFORM_BRAND[platform] ?? "#6b7280";
    return b === "#010101" || b === "#000000" ? "#ff004f" : b;
  }

  return (
    <div style={{ backgroundColor: BG, minHeight: "100vh", color: TEXT }}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold mb-1" style={{ color: TEXT }}>Account Groups</h1>
          <p className="text-sm" style={{ color: MUTED }}>
            Group connected accounts so you can select them all at once in{" "}
            <Link href="/compose" className="underline" style={{ color: ACCENT }}>Compose</Link>.
          </p>
        </div>

        {/* Create group */}
        <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: MUTED }}>New Group</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createGroup(); }}
              placeholder="e.g. Brand channels, Personal, Clients…"
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: BG, border: `1px solid ${BORDER}`, color: TEXT }}
            />
            <button
              onClick={createGroup}
              disabled={creating || !newGroupName.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!loading && groups.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-10 h-10 mx-auto mb-4 opacity-20" fill="none" stroke={TEXT} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm" style={{ color: MUTED }}>No groups yet. Create one above.</p>
          </div>
        )}

        {/* Groups list */}
        {!loading && accounts.length === 0 && groups.length === 0 && (
          <p className="text-sm text-center" style={{ color: MUTED }}>
            <Link href="/accounts" className="underline" style={{ color: ACCENT }}>Connect accounts</Link> first, then create groups.
          </p>
        )}

        <div className="space-y-4">
          {groups.map(group => {
            const memberCount = group.accountIds.filter(id => accounts.some(a => a.id === id)).length;
            return (
              <div key={group.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                {/* Group header */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={ACCENT} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>

                  {editingGroup === group.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editGroupName}
                      onChange={e => setEditGroupName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") renameGroup(group.id);
                        if (e.key === "Escape") setEditingGroup(null);
                      }}
                      onBlur={() => renameGroup(group.id)}
                      className="flex-1 px-2 py-0.5 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "#1a1a1a", border: `1px solid #3a3a3a`, color: TEXT }}
                    />
                  ) : (
                    <span className="flex-1 text-sm font-semibold" style={{ color: TEXT }}>{group.name}</span>
                  )}

                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#1a1a1a", color: MUTED, border: `1px solid ${BORDER}` }}>
                    {memberCount} {memberCount === 1 ? "account" : "accounts"}
                  </span>
                  <button
                    onClick={() => { setEditingGroup(group.id); setEditGroupName(group.name); }}
                    className="text-xs transition-colors hover:opacity-80"
                    style={{ color: MUTED }}>
                    Rename
                  </button>
                  <button
                    onClick={() => deleteGroup(group.id)}
                    className="text-xs transition-colors hover:opacity-80"
                    style={{ color: "#ef4444" }}>
                    Delete
                  </button>
                </div>

                {/* Account toggles */}
                {accounts.length === 0 ? (
                  <p className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                    No connected accounts.{" "}
                    <Link href="/accounts" className="underline" style={{ color: ACCENT }}>Connect one</Link>.
                  </p>
                ) : (
                  <div className="p-3 flex flex-wrap gap-2">
                    {accounts.map(a => {
                      const inGroup = group.accountIds.includes(a.id);
                      const color = brandColor(a.platform);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleMember(group.id, a.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                          style={inGroup ? {
                            background: color + "18",
                            border: `1px solid ${color}50`,
                            color: color,
                          } : {
                            background: BG,
                            border: `1px solid ${BORDER}`,
                            color: MUTED,
                          }}>
                          {a.avatarUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={a.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                            : <PlatformIcon platform={a.platform} size={12} />}
                          <span className="truncate max-w-[96px]">{a.displayName}</span>
                          {inGroup && (
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
