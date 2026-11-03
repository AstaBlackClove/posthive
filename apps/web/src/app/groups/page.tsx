"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { PlatformIcon } from "../../components/PlatformIcon";
import { useToast } from "../../components/Toast";
import { cn } from "../../lib/cn";
import { PLATFORM_COLOR } from "../../components/PlatformPreview";

// Platform-native color, fed to classes via the --platform CSS variable.
// Near-black brands (threads, x, tiktok) read fine on the light theme, so no substitutes.
function brandColor(platform: string) {
  return PLATFORM_COLOR[platform] ?? "#6b7280";
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
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card w-full max-w-md flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="type-body-sb-s text-fg">
            {initial ? "Edit Group" : "New Group"}
          </h2>
          <button onClick={onClose} className="opacity-40 hover:opacity-80 transition-opacity text-fg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Name */}
          <div>
            <label className="section-label block mb-1.5">Group name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
              placeholder="e.g. Brand channels, Personal, Clients…"
              className="field"
            />
          </div>

          {/* Account picker */}
          <div>
            <label className="section-label block mb-2">
              Accounts{selected.length > 0 && <span className="ml-1.5 normal-case type-body-r-xs text-brand-800">({selected.length} selected)</span>}
            </label>

            {accounts.length === 0 ? (
              <p className="type-body-r-xs text-muted">
                No connected accounts.{" "}
                <Link href="/accounts" className="underline text-brand-800">Connect one first.</Link>
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
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left border",
                        inGroup ? "border-(--platform)/25 bg-(--platform)/7" : "border-border bg-bg",
                      )}
                      style={{ "--platform": color } as React.CSSProperties}>
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {a.avatarUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={a.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-(--platform)/20 bg-(--platform)/12">
                              <PlatformIcon platform={a.platform} size={16} />
                            </div>
                          )}
                        {/* Platform badge */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-border bg-bg">
                          <PlatformIcon platform={a.platform} size={10} />
                        </div>
                      </div>
                      {/* Name + platform */}
                      <div className="flex-1 min-w-0">
                        <p className="type-body-m-s truncate text-fg">{a.displayName}</p>
                        <p className={cn("type-body-r-xs", inGroup ? "text-(--platform)" : "text-muted")}>{platformLabel}</p>
                      </div>
                      {/* Checkmark */}
                      {inGroup && (
                        <svg className="w-4 h-4 shrink-0 text-(--platform)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 text-muted">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="btn-primary flex-1">
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
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card w-full max-w-sm">
        <div className="px-5 py-5">
          <h2 className="type-body-sb-s mb-1 text-fg">Delete group?</h2>
          <p className="type-body-r-s text-muted">
            <span className="text-fg">"{group.name}"</span> will be permanently deleted. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 text-muted">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-danger flex-1">
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
    <div className="flex flex-col h-full overflow-hidden bg-bg text-fg">

      {/* Header */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="type-body-sb-l text-fg">Account Groups</h1>
          <p className="type-body-r-xs mt-0.5 hidden sm:block text-muted">
            Group accounts to select them all at once in{" "}
            <Link href="/compose" className="underline text-brand-800">Compose</Link>.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary gap-1.5 shrink-0">
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
            <svg className="w-10 h-10 mx-auto mb-4 opacity-20 text-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/></svg>
            <p className="type-body-r-s mb-4 text-muted">No groups yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary">
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
              <div key={group.id} className="card p-4">
                {/* Top row */}
                <div className="flex items-center gap-3">
                  {/* Group icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-brand-300 bg-brand-100">
                    <svg className="w-4 h-4 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {/* Name + count */}
                  <div className="flex-1 min-w-0">
                    <p className="type-body-sb-s truncate text-fg">{group.name}</p>
                    <p className="type-body-r-xs text-muted">{memberCount} account{memberCount !== 1 ? "s" : ""}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingGroup(group)}
                      className="btn-secondary gap-1.5 px-3 py-1.5 rounded-lg type-body-m-xs text-muted hover:text-fg">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingGroup(group)}
                      className="btn-secondary gap-1.5 px-3 py-1.5 rounded-lg type-body-m-xs border-red-200 bg-red-50 text-red-600 hover:bg-red-100">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
                {/* Member avatars */}
                {memberAccounts.length > 0 ? (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <div className="flex -space-x-2">
                      {memberAccounts.slice(0, 8).map(a => {
                        const color = brandColor(a.platform);
                        return (
                          <div key={a.id} className="relative w-7 h-7 rounded-full shrink-0 border-2 border-surface"
                            style={{ "--platform": color } as React.CSSProperties}
                            title={a.displayName}>
                            {a.avatarUrl
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={a.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                              : (
                                <div className="w-full h-full rounded-full flex items-center justify-center bg-(--platform)/12">
                                  <PlatformIcon platform={a.platform} size={12} />
                                </div>
                              )}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center border border-border bg-surface">
                              <PlatformIcon platform={a.platform} size={8} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-1 min-w-0">
                      {memberAccounts.slice(0, 4).map(a => (
                        <span key={a.id} className="chip block px-1.5 py-0.5 type-body-m-xs truncate max-w-30 cursor-default hover:text-muted">
                          {a.displayName}
                        </span>
                      ))}
                      {memberCount > 4 && (
                        <span className="chip px-1.5 py-0.5 type-body-m-xs cursor-default hover:text-muted">
                          +{memberCount - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 flex items-center gap-2 border-t border-border">
                    <p className="type-body-r-xs text-muted">No accounts — click Edit to add some.</p>
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
