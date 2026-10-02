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

function brandColor(platform: string) {
  const b = PLATFORM_BRAND[platform] ?? "#6b7280";
  return b === "#010101" || b === "#000000" ? "#ff004f" : b;
}

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

// ── Create / Edit dialog ──────────────────────────────────────────────────────
function GroupDialog({
  accounts,
  initial,
  onSave,
  onClose,
}: {
  accounts: Account[];
  initial?: Group;
  onSave: (name: string, accountIds: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.accountIds ?? []);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(name.trim(), selected); }
    finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl flex flex-col" style={{ backgroundColor: "#111111", border: `1px solid ${BORDER}`, maxHeight: "80vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <h2 className="text-sm font-bold" style={{ color: TEXT }}>
            {initial ? "Edit Group" : "New Group"}
          </h2>
          <button onClick={onClose} className="opacity-40 hover:opacity-80 transition-opacity" style={{ color: TEXT }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: MUTED }}>Group name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
              placeholder="e.g. Brand channels, Personal, Clients…"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: BG, border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>

          {/* Account picker */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: MUTED }}>
              Accounts{selected.length > 0 && <span className="ml-1.5 normal-case font-normal" style={{ color: ACCENT }}>({selected.length} selected)</span>}
            </label>

            {accounts.length === 0 ? (
              <p className="text-xs" style={{ color: MUTED }}>
                No connected accounts.{" "}
                <Link href="/accounts" className="underline" style={{ color: ACCENT }}>Connect one first.</Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map(a => {
                  const inGroup = selected.includes(a.id);
                  const color = brandColor(a.platform);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggle(a.id)}
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
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
            style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, color: MUTED }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
            {saving ? (initial ? "Saving…" : "Creating…") : (initial ? "Save" : "Create group")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function GroupsPage() {
  const { success, error: toastError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

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

  async function handleCreate(name: string, accountIds: string[]) {
    const g = await apiFetch<Group>("/account-groups", {
      method: "POST",
      body: JSON.stringify({ name, accountIds }),
    });
    setGroups(prev => [...prev, g]);
    setShowCreate(false);
    success("Group created");
  }

  async function handleEdit(name: string, accountIds: string[]) {
    if (!editingGroup) return;
    const updated = await apiFetch<Group>(`/account-groups/${editingGroup.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, accountIds }),
    });
    setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
    setEditingGroup(null);
    success("Group updated");
  }

  async function deleteGroup(groupId: string) {
    try {
      await apiFetch(`/account-groups/${groupId}`, { method: "DELETE" });
      setGroups(prev => prev.filter(g => g.id !== groupId));
      success("Group deleted");
    } catch { toastError("Failed to delete group"); }
  }

  return (
    <div style={{ backgroundColor: BG, minHeight: "100vh", color: TEXT }}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold mb-1" style={{ color: TEXT }}>Account Groups</h1>
            <p className="text-sm" style={{ color: MUTED }}>
              Group accounts to select them all at once in{" "}
              <Link href="/compose" className="underline" style={{ color: ACCENT }}>Compose</Link>.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100 flex-shrink-0"
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New group
          </button>
        </div>

        {/* Empty state */}
        {!loading && groups.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-10 h-10 mx-auto mb-4 opacity-20" fill="none" stroke={TEXT} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm mb-4" style={{ color: MUTED }}>No groups yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-100"
              style={{ backgroundColor: "#ffffff", color: "#0a0a0a" }}>
              Create your first group
            </button>
          </div>
        )}

        {/* Groups list */}
        <div className="space-y-3">
          {groups.map(group => {
            const memberCount = group.accountIds.filter(id => accounts.some(a => a.id === id)).length;
            const memberAccounts = accounts.filter(a => group.accountIds.includes(a.id));
            return (
              <div key={group.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>

                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={ACCENT} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>{group.name}</p>
                  {memberAccounts.length > 0 ? (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {memberAccounts.slice(0, 6).map(a => (
                        <span key={a.id} className="text-xs px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: brandColor(a.platform) + "18", color: brandColor(a.platform), border: `1px solid ${brandColor(a.platform)}30` }}>
                          {a.displayName}
                        </span>
                      ))}
                      {memberCount > 6 && (
                        <span className="text-xs" style={{ color: MUTED }}>+{memberCount - 6} more</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: MUTED }}>No accounts — click Edit to add some</p>
                  )}
                </div>

                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "#1a1a1a", color: MUTED, border: `1px solid ${BORDER}` }}>
                  {memberCount}
                </span>

                <button
                  onClick={() => setEditingGroup(group)}
                  className="text-xs transition-colors hover:opacity-80 flex-shrink-0"
                  style={{ color: MUTED }}>
                  Edit
                </button>
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="text-xs transition-colors hover:opacity-80 flex-shrink-0"
                  style={{ color: "#ef4444" }}>
                  Delete
                </button>
              </div>
            );
          })}
        </div>

      </div>

      {showCreate && (
        <GroupDialog
          accounts={accounts}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingGroup && (
        <GroupDialog
          accounts={accounts}
          initial={editingGroup}
          onSave={handleEdit}
          onClose={() => setEditingGroup(null)}
        />
      )}
    </div>
  );
}
