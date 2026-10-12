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
  // near-black brands invisible on dark bg → use visible substitute
  if (b === "#010101" || b === "#000000") return "#ff004f"; // tiktok
  if (b === "#1a1a1a") return "#ededed"; // threads
  return b;
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
              <div className="space-y-1.5">
                {accounts.map(a => {
                  const inGroup = selected.includes(a.id);
                  const color = brandColor(a.platform);
                  const platformLabel = a.platform.charAt(0).toUpperCase() + a.platform.slice(1);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggle(a.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                      style={inGroup ? {
                        background: color + "12",
                        border: `1px solid ${color}40`,
                      } : {
                        background: BG,
                        border: `1px solid ${BORDER}`,
                      }}>
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {a.avatarUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={a.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: color + "20", border: `1px solid ${color}30` }}>
                              <PlatformIcon platform={a.platform} size={16} />
                            </div>
                          )}
                        {/* Platform badge */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "#0a0a0a", border: `1px solid ${BORDER}` }}>
                          <PlatformIcon platform={a.platform} size={10} />
                        </div>
                      </div>
                      {/* Name + platform */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: inGroup ? TEXT : TEXT }}>{a.displayName}</p>
                        <p className="text-xs" style={{ color: inGroup ? color : MUTED }}>{platformLabel}</p>
                      </div>
                      {/* Checkmark */}
                      {inGroup && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={color} viewBox="0 0 24 24">
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

// ── Confirm delete dialog ─────────────────────────────────────────────────────
function ConfirmDeleteDialog({ group, onConfirm, onClose }: { group: Group; onConfirm: () => void; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl" style={{ backgroundColor: "#111111", border: `1px solid ${BORDER}` }}>
        <div className="px-5 py-5">
          <h2 className="text-sm font-bold mb-1" style={{ color: TEXT }}>Delete group?</h2>
          <p className="text-sm" style={{ color: MUTED }}>
            <span style={{ color: TEXT }}>"{group.name}"</span> will be permanently deleted. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
            style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, color: MUTED }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
            style={{ backgroundColor: "#ef4444", color: "#fff" }}>
            Delete
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
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

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

  async function deleteGroup(group: Group) {
    try {
      await apiFetch(`/account-groups/${group.id}`, { method: "DELETE" });
      setGroups(prev => prev.filter(g => g.id !== group.id));
      setDeletingGroup(null);
      success("Group deleted");
    } catch { toastError("Failed to delete group"); }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: BG, color: TEXT }}>

      {/* Header */}
      <div className="pl-16 pr-4 md:px-8 flex-shrink-0 flex items-center justify-between" style={{ height: 65, borderBottom: `1px solid ${BORDER}` }}>
        <div className="min-w-0">
          <h1 className="text-lg font-bold" style={{ color: TEXT }}>Account Groups</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: MUTED }}>
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

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div>

        {/* Empty state */}
        {!loading && groups.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-10 h-10 mx-auto mb-4 opacity-20" fill="none" stroke={TEXT} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></svg>
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
              <div key={group.id} className="rounded-2xl p-4"
                style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                {/* Top row */}
                <div className="flex items-center gap-3">
                  {/* Group icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: ACCENT + "18", border: `1px solid ${ACCENT}30` }}>
                    <svg className="w-4 h-4" fill="none" stroke={ACCENT} viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {/* Name + count */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>{group.name}</p>
                    <p className="text-xs" style={{ color: MUTED }}>{memberCount} account{memberCount !== 1 ? "s" : ""}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingGroup(group)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                      style={{ backgroundColor: "#1a1a1a", color: MUTED, border: `1px solid ${BORDER}` }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingGroup(group)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                      style={{ backgroundColor: "#ef444410", color: "#ef4444", border: "1px solid #ef444430" }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
                {/* Member avatars */}
                {memberAccounts.length > 0 ? (
                  <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <div className="flex -space-x-2">
                      {memberAccounts.slice(0, 8).map(a => {
                        const color = brandColor(a.platform);
                        return (
                          <div key={a.id} className="relative w-7 h-7 rounded-full flex-shrink-0"
                            style={{ border: `2px solid ${SURFACE}` }}
                            title={a.displayName}>
                            {a.avatarUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={a.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                              : (
                                <div className="w-full h-full rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: color + "20" }}>
                                  <PlatformIcon platform={a.platform} size={12} />
                                </div>
                              )}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                              <PlatformIcon platform={a.platform} size={8} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {memberAccounts.slice(0, 4).map(a => (
                        <span key={a.id} className="text-xs px-1.5 py-0.5 rounded-md truncate max-w-[120px]"
                          style={{ backgroundColor: brandColor(a.platform) + "15", color: brandColor(a.platform) === "#010101" ? "#ff004f" : brandColor(a.platform) }}>
                          {a.displayName}
                        </span>
                      ))}
                      {memberCount > 4 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "#1a1a1a", color: MUTED }}>
                          +{memberCount - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <p className="text-xs" style={{ color: MUTED }}>No accounts — click Edit to add some.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

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

      {deletingGroup && (
        <ConfirmDeleteDialog
          group={deletingGroup}
          onConfirm={() => deleteGroup(deletingGroup)}
          onClose={() => setDeletingGroup(null)}
        />
      )}
    </div>
  );
}
