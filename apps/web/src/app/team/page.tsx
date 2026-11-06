"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../../components/Toast";
import { cn } from "../../lib/cn";
import { isAdminRole, isOwnerRole } from "../../lib/permissions";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
  isCurrentUser: boolean;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

type RoleChoice = "admin" | "designer" | "member";

export default function TeamPage() {
  const { activeWorkspace, refresh } = useWorkspace();
  const { toast } = useToast();
  // This page reads the workspace role only (no session fallback): with no workspace there are no admin controls
  const isAdmin = isAdminRole(activeWorkspace?.role);
  const isOwner = isOwnerRole(activeWorkspace?.role);

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleChoice>("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);

  useEffect(() => {
    setApprovalRequired(activeWorkspace?.approvalRequired ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, activeWorkspace?.approvalRequired]);

  useEffect(() => {
    if (activeWorkspace) loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  async function loadTeam() {
    if (!activeWorkspace) return;
    setTeamLoading(true);
    try {
      const [membersData, invitesData] = await Promise.all([
        apiFetch<{ members: Member[] }>(`/workspaces/${activeWorkspace.id}/members`),
        apiFetch<{ invites: Invite[] }>(`/workspaces/${activeWorkspace.id}/invites`),
      ]);
      setMembers(membersData.members ?? []);
      setInvites(invitesData.invites ?? []);
    } catch {
      // member role can't see members — ignore
    } finally {
      setTeamLoading(false);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace) return;
    setInviteLoading(true);
    try {
      await apiFetch(`/workspaces/${activeWorkspace.id}/invite`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      toast("Invite sent", "success");
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("member");
      loadTeam();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to send invite", "error");
    } finally {
      setInviteLoading(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!activeWorkspace) return;
    setRemovingId(memberId);
    try {
      await apiFetch(`/workspaces/${activeWorkspace.id}/members/${memberId}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast("Member removed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove member", "error");
    } finally {
      setRemovingId(null);
    }
  }

  async function changeRole(memberId: string, role: RoleChoice) {
    if (!activeWorkspace) return;
    try {
      await apiFetch(`/workspaces/${activeWorkspace.id}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m));
      toast("Role updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update role", "error");
    }
  }

  async function cancelInvite(inviteId: string) {
    if (!activeWorkspace) return;
    setCancellingInviteId(inviteId);
    try {
      await apiFetch(`/workspaces/${activeWorkspace.id}/invites/${inviteId}`, { method: "DELETE" });
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast("Invite cancelled", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to cancel invite", "error");
    } finally {
      setCancellingInviteId(null);
    }
  }

  async function toggleApproval() {
    if (!activeWorkspace) return;
    const next = !approvalRequired;
    setApprovalLoading(true);
    try {
      await apiFetch(`/workspaces/${activeWorkspace.id}`, {
        method: "PATCH",
        body: JSON.stringify({ approvalRequired: next }),
      });
      setApprovalRequired(next);
      refresh();
      toast(next ? "Design review on — member posts need approval" : "Design review off", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update setting", "error");
    } finally {
      setApprovalLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="type-body-sb-l text-fg">Team</h1>
          <p className="type-body-r-xs mt-0.5 hidden sm:block text-muted">Manage members and invitations for {activeWorkspace?.name}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-primary rounded-lg"
          >
            Invite member
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">

        {/* Members */}
        <div className="card overflow-hidden">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-brand-300 bg-brand-100">
                <svg className="w-4 h-4 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div>
                <p className="type-body-sb-s text-fg">Members</p>
                <p className="type-body-r-xs text-muted">{activeWorkspace?.name}</p>
              </div>
            </div>
            <span className="type-body-sb-xs px-2.5 py-1 rounded-full border border-brand-300 bg-brand-100 text-brand-800">
              {activeWorkspace?.memberCount ?? members.length} member{(activeWorkspace?.memberCount ?? members.length) !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="p-4">
            {teamLoading ? (
              <p className="type-body-r-xs px-2 text-muted">Loading…</p>
            ) : members.length === 0 ? (
              <p className="type-body-r-xs px-2 text-muted">No members visible. Only owners and admins can see the member list.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => {
                  const initial = m.name?.[0]?.toUpperCase() ?? "?";
                  const canManage = isAdmin;
                  const canChangeRole = isOwner && m.role !== "owner";
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors border border-border bg-bg">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {m.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.avatarUrl} alt={m.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center type-body-sb-s bg-accent text-accent-fg">
                            {initial}
                          </div>
                        )}
                        {m.isCurrentUser && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-bg bg-green-500" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="type-body-m-s truncate text-fg">{m.name}</p>
                          {m.isCurrentUser && <span className="type-body-r-xs shrink-0 text-neutral-500">you</span>}
                        </div>
                        <p className="type-body-r-xs truncate text-muted">{m.email}</p>
                      </div>
                      {/* Role */}
                      {canChangeRole ? (
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value as RoleChoice)}
                          className="cursor-pointer rounded-full border border-border bg-surface px-2.5 py-1 type-body-sb-xs text-muted outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="designer">Designer</option>
                          <option value="member">Member</option>
                        </select>
                      ) : (
                        <span className={cn(
                          "shrink-0 rounded-full border px-2.5 py-1 type-body-sb-xs capitalize",
                          m.role === "owner" || m.role === "admin"
                            ? "border-brand-300 bg-brand-100 text-brand-800"
                            : m.role === "designer"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-border bg-surface text-muted",
                        )}>
                          {m.role}
                        </span>
                      )}
                      {canManage && !m.isCurrentUser && m.role !== "owner" && (
                        <button
                          onClick={() => removeMember(m.id)}
                          disabled={removingId === m.id}
                          className="flex items-center gap-1 type-body-sb-xs px-2.5 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"/>
                          </svg>
                          {removingId === m.id ? "…" : "Remove"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Design review toggle */}
        {isAdmin && (
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-brand-300 bg-brand-100">
                <svg className="w-4 h-4 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                </svg>
              </div>
              <div>
                <p className="type-body-sb-s text-fg">Design review</p>
                <p className="type-body-r-xs text-muted">Require approval before members can schedule posts</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="type-body-r-xs text-muted">
                  Member posts stay as drafts until a <strong className="text-green-700">Designer</strong>, Admin, or Owner approves them.
                  {approvalRequired && members.some((m) => m.role === "designer") ? "" : " Invite a design team member with the Designer role first."}
                </p>
              </div>
              <button
                onClick={toggleApproval}
                disabled={approvalLoading}
                aria-label={approvalRequired ? "Disable design review" : "Enable design review"}
                className={cn(
                  "relative shrink-0 rounded-full transition-colors w-11 h-6 border cursor-pointer disabled:cursor-wait",
                  approvalRequired ? "bg-accent border-accent" : "bg-neutral-100 border-neutral-300",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1/2 rounded-full transition-all size-4 -translate-y-1/2 bg-bg shadow-sm",
                    approvalRequired ? "left-6" : "left-0.5",
                  )}
                />
              </button>
            </div>
          </div>
        )}

        {/* Pending invites */}
        {isAdmin && (
          <div className="card overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-brand-400 bg-brand-100">
                  <svg className="w-4 h-4 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p className="type-body-sb-s text-fg">Pending invites</p>
                  <p className="type-body-r-xs text-muted">Expire after 7 days</p>
                </div>
              </div>
              {invites.length > 0 && (
                <span className="type-body-sb-xs px-2.5 py-1 rounded-full border border-brand-400 bg-brand-100 text-brand-800">
                  {invites.length} pending
                </span>
              )}
            </div>

            <div className="p-4">
              {invites.length === 0 ? (
                <div className="flex items-center gap-2 px-2 py-1">
                  <svg className="w-4 h-4 shrink-0 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <p className="type-body-r-xs text-muted">No pending invites. Use "Invite member" to add someone.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invites.map((inv) => {
                    const daysLeft = Math.max(0, Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / 86400000));
                    return (
                      <div key={inv.id} className="flex items-center gap-3 rounded-xl px-4 py-3 border border-border bg-bg">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-brand-300 bg-brand-100">
                          <svg className="w-4 h-4 text-brand-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="type-body-m-s truncate text-fg">{inv.email}</p>
                          <p className="type-body-r-xs text-muted">
                            <span className="capitalize">{inv.role}</span>
                            {" · "}
                            <span className={cn(daysLeft <= 1 && "text-red-600")}>{daysLeft}d left</span>
                          </p>
                        </div>
                        <button
                          onClick={() => cancelInvite(inv.id)}
                          disabled={cancellingInviteId === inv.id}
                          className="type-body-sb-xs px-2.5 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                        >
                          {cancellingInviteId === inv.id ? "…" : "Revoke"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="card w-full max-w-sm p-6 modal-panel">
            <h2 className="type-body-sb-m mb-1 text-fg">Invite member</h2>
            <p className="type-body-r-xs mb-5 text-muted">They&apos;ll receive an email with a link to join {activeWorkspace?.name}.</p>
            <form onSubmit={sendInvite} className="space-y-4">
              <div>
                <label className="block type-body-m-xs mb-1.5 text-muted">Email address</label>
                <input
                  type="email"
                  autoFocus
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  required
                  className="field"
                />
              </div>
              <div>
                <label className="block type-body-m-xs mb-1.5 text-muted">Role</label>
                  <select
                   value={inviteRole}
                   onChange={(e) => setInviteRole(e.target.value as RoleChoice)}
                   className="field"
                 >
                   <option value="member">Member — can compose and view posts</option>
                   <option value="designer">Designer — reviews and approves member posts</option>
                   <option value="admin">Admin — can manage accounts and members</option>
                 </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowInviteModal(false); setInviteEmail(""); setInviteRole("member"); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="btn-primary flex-1"
                >
                  {inviteLoading ? "Sending…" : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
