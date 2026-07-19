"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../../components/Toast";

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

export default function TeamPage() {
  const { activeWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);

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

  async function changeRole(memberId: string, role: "admin" | "member") {
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="pl-16 pr-4 md:px-8 flex-shrink-0 flex items-center justify-between" style={{ height: 65, borderBottom: "1px solid #2a2a2a" }}>
        <div className="min-w-0">
          <h1 className="text-lg font-bold" style={{ color: "#ededed" }}>Team</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "#aaaaaa" }}>Manage members and invitations for {activeWorkspace?.name}</p>
        </div>
        {(activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin") && (
          <button
            onClick={() => setShowInviteModal(true)}
            style={{ backgroundColor: "#ffffff", color: "#0a0a0a", border: "none", borderRadius: 9, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Invite member
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">

        {/* Members */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
          <div className="mb-5">
            <h2 className="text-sm font-semibold" style={{ color: "#ededed" }}>Members</h2>
            <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>
              {activeWorkspace?.name} · {activeWorkspace?.memberCount ?? members.length} member{(activeWorkspace?.memberCount ?? members.length) !== 1 ? "s" : ""}
            </p>
          </div>
          {teamLoading ? (
            <p className="text-xs" style={{ color: "#555" }}>Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-xs" style={{ color: "#555" }}>No members visible. Only owners and admins can see the member list.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const initial = m.name?.[0]?.toUpperCase() ?? "?";
                const canManage = activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";
                const canChangeRole = activeWorkspace?.role === "owner" && m.role !== "owner";
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a" }}>
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ backgroundColor: "#5b63d3" }}>
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#ededed" }}>
                        {m.name}{m.isCurrentUser && <span className="ml-1.5 text-xs" style={{ color: "#555" }}>(you)</span>}
                      </p>
                      <p className="text-xs truncate" style={{ color: "#555" }}>{m.email}</p>
                    </div>
                    {canChangeRole ? (
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value as "admin" | "member")}
                        style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99, border: "1px solid #3a3a3a", backgroundColor: "#1a1a1a", color: "#aaa", cursor: "pointer", outline: "none" }}
                      >
                        <option value="admin">admin</option>
                        <option value="member">member</option>
                      </select>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                        backgroundColor: m.role === "owner" ? "rgba(91,99,211,0.2)" : m.role === "admin" ? "rgba(91,99,211,0.12)" : "rgba(136,136,136,0.1)",
                        color: m.role === "owner" ? "#a5aaff" : m.role === "admin" ? "#8a8fff" : "#666",
                        textTransform: "capitalize",
                      }}>
                        {m.role}
                      </span>
                    )}
                    {canManage && !m.isCurrentUser && m.role !== "owner" && (
                      <button
                        onClick={() => removeMember(m.id)}
                        disabled={removingId === m.id}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: "#2a1010", color: "#f87171", border: "1px solid #5a2020", opacity: removingId === m.id ? 0.5 : 1, cursor: removingId === m.id ? "wait" : "pointer" }}
                      >
                        {removingId === m.id ? "…" : "Remove"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending invites */}
        {(activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin") && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            <h2 className="text-sm font-semibold mb-1" style={{ color: "#ededed" }}>Pending invites</h2>
            <p className="text-xs mb-5" style={{ color: "#aaa" }}>Invites expire after 7 days.</p>
            {invites.length === 0 ? (
              <p className="text-xs" style={{ color: "#555" }}>No pending invites.</p>
            ) : (
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#ededed" }}>{inv.email}</p>
                      <p className="text-xs" style={{ color: "#555" }}>
                        {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => cancelInvite(inv.id)}
                      disabled={cancellingInviteId === inv.id}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: "#2a1010", color: "#f87171", border: "1px solid #5a2020", opacity: cancellingInviteId === inv.id ? 0.5 : 1, cursor: cancellingInviteId === inv.id ? "wait" : "pointer" }}
                    >
                      {cancellingInviteId === inv.id ? "…" : "Cancel"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl p-6 modal-panel" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
            <h2 className="text-base font-bold mb-1" style={{ color: "#ededed" }}>Invite member</h2>
            <p className="text-xs mb-5" style={{ color: "#aaa" }}>They&apos;ll receive an email with a link to join {activeWorkspace?.name}.</p>
            <form onSubmit={sendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Email address</label>
                <input
                  type="email"
                  autoFocus
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  required
                  style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#ededed", outline: "none" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaa" }}>Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                  style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#ededed", outline: "none" }}
                >
                  <option value="member">Member - can compose and view posts</option>
                  <option value="admin">Admin - can manage accounts and members</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowInviteModal(false); setInviteEmail(""); setInviteRole("member"); }}
                  style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 13, fontWeight: 600, backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail.trim()}
                  style={{ flex: 1, padding: "8px", borderRadius: 10, fontSize: 13, fontWeight: 600, backgroundColor: "#ffffff", color: "#0a0a0a", border: "none", cursor: (inviteLoading || !inviteEmail.trim()) ? "not-allowed" : "pointer", opacity: (inviteLoading || !inviteEmail.trim()) ? 0.5 : 1 }}
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
