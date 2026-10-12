"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useToast } from "../../components/Toast";
import type { ReactNode } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TIMEZONES: string[] = (Intl as any).supportedValuesOf("timeZone");

function Section({ title, description, icon, children }: { title: string; description?: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#5b63d315", border: "1px solid #5b63d330" }}>
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "#ededed" }}>{title}</h2>
          {description && <p className="text-xs mt-0.5" style={{ color: "#555" }}>{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "#888" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  backgroundColor: "#0a0a0a",
  border: "1px solid #2a2a2a",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 13,
  color: "#ededed",
  outline: "none",
};

const btnStyle = {
  backgroundColor: "#ffffff",
  color: "#0a0a0a",
  border: "none",
  borderRadius: 10,
  padding: "8px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

export default function SettingsPage() {
  const { user, logout, refresh } = useAuth();
  const { activeWorkspace, workspaces } = useWorkspace();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showDeleteWorkspace, setShowDeleteWorkspace] = useState(false);
  const [deleteWorkspaceConfirm, setDeleteWorkspaceConfirm] = useState("");
  const [deleteWorkspaceLoading, setDeleteWorkspaceLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
      setTimezone(user.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await apiFetch("/user/profile", { method: "PATCH", body: JSON.stringify({ name, timezone }) });
      await refresh();
      toast("Profile updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally {
      setProfileLoading(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("New passwords don't match", "error");
      return;
    }
    setPwLoading(true);
    try {
      await apiFetch("/user/password", { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) });
      toast("Password changed", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to change password", "error");
    } finally {
      setPwLoading(false);
    }
  }

  async function deleteAccount() {
    setDeleteLoading(true);
    try {
      await apiFetch("/user", { method: "DELETE", body: JSON.stringify({ password: deletePassword }) });
      await logout();
      router.push("/login");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete account", "error");
      setDeleteLoading(false);
    }
  }

  async function deleteWorkspace() {
    if (!activeWorkspace) return;
    setDeleteWorkspaceLoading(true);
    try {
      await apiFetch(`/workspaces/${activeWorkspace.id}`, { method: "DELETE" });
      window.location.href = "/compose";
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete workspace", "error");
      setShowDeleteWorkspace(false);
      setDeleteWorkspaceConfirm("");
    } finally {
      setDeleteWorkspaceLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="pl-16 pr-4 md:px-8 flex-shrink-0 flex items-center" style={{ height: 65, borderBottom: "1px solid #2a2a2a" }}>
        <div className="min-w-0">
          <h1 className="text-lg font-bold" style={{ color: "#ededed" }}>Settings</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "#aaaaaa" }}>Manage your account and preferences</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">

        {/* Top row: Profile + Password */}
        <div className={`grid grid-cols-1 gap-5 ${user?.hasPassword ? "md:grid-cols-2" : ""}`}>
          <Section
            title="Profile"
            description="Update your display name and email address"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="#5b63d3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            }
          >
            <form onSubmit={saveProfile} className="space-y-4">
              <Field label="Name">
                <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Your name" />
              </Field>
              <Field label="Email">
                <input type="email" value={email} disabled style={{ ...inputStyle, opacity: 0.4, cursor: "not-allowed" }} />
              </Field>
              <Field label="Timezone">
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={inputStyle}>
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </Field>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={profileLoading} style={{ ...btnStyle, opacity: profileLoading ? 0.6 : 1 }}>
                  {profileLoading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </Section>

          {user?.hasPassword && (
            <Section
              title="Password"
              description="Choose a strong password, at least 8 characters"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="#5b63d3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              }
            >
              <form onSubmit={changePassword} className="space-y-4">
                <Field label="Current password">
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
                </Field>
                <Field label="New password">
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
                </Field>
                <Field label="Confirm new password">
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
                </Field>
                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                    style={{ ...btnStyle, opacity: (pwLoading || !currentPassword || !newPassword || !confirmPassword) ? 0.5 : 1 }}>
                    {pwLoading ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            </Section>
          )}
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
          {/* Section header */}
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #2a2a2a" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#f8717115", border: "1px solid #f8717130" }}>
              <svg className="w-4 h-4" fill="none" stroke="#f87171" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#f87171" }}>Danger zone</h2>
              <p className="text-xs mt-0.5" style={{ color: "#555" }}>Irreversible actions proceed with caution</p>
            </div>
          </div>

          <div>
            {user?.role === "owner" ? (() => {
              const isLastWorkspace = workspaces.filter((w) => w.role === "owner").length <= 1;
              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#ededed" }}>Delete workspace</p>
                    <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                      Permanently delete <strong style={{ color: "#aaa" }}>{activeWorkspace?.name}</strong> and all its accounts, posts, and members.
                    </p>
                    {isLastWorkspace && (
                      <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#f87171" }}>
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                        Cannot delete your only workspace
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowDeleteWorkspace(true)}
                    disabled={isLastWorkspace}
                    className="text-xs font-semibold px-4 py-2 rounded-xl flex-shrink-0 self-start transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#f8717112", color: "#f87171", border: "1px solid #f8717130" }}>
                    Delete workspace
                  </button>
                </div>
              );
            })() : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#ededed" }}>Leave workspace</p>
                  <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                    Remove yourself from <strong style={{ color: "#aaa" }}> {activeWorkspace?.name} </strong>. You will lose access immediately.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!activeWorkspace) return;
                    if (!confirm(`Leave ${activeWorkspace.name}? You will lose access immediately.`)) return;
                    try {
                      await apiFetch(`/workspaces/${activeWorkspace.id}/leave`, { method: "DELETE" });
                      window.location.href = "/compose";
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Failed to leave workspace", "error");
                    }
                  }}
                  className="text-xs font-semibold px-4 py-2 rounded-xl flex-shrink-0 self-start"
                  style={{ backgroundColor: "#f8717112", color: "#f87171", border: "1px solid #f8717130" }}>
                  Leave workspace
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4" style={{ borderTop: "1px solid #1e1e1e" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "#ededed" }}>Delete account</p>
                <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                  Permanently delete your account and all scheduled posts. Cannot be undone.
                </p>
              </div>
              <button onClick={() => setShowDelete(true)}
                className="text-xs font-semibold px-4 py-2 rounded-xl flex-shrink-0 self-start"
                style={{ backgroundColor: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b" }}>
                Delete account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete workspace confirm */}
      {showDeleteWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl p-6 modal-panel" style={{ backgroundColor: "#111111", border: "1px solid #3a1a1a" }}>
            <h2 className="text-base font-bold mb-1" style={{ color: "#f87171" }}>Delete workspace?</h2>
            <p className="text-xs mb-4" style={{ color: "#aaaaaa" }}>
              All accounts, posts, templates, and members in <strong style={{ color: "#ededed" }}>{activeWorkspace?.name}</strong> will be permanently deleted. Type the workspace name to confirm.
            </p>
            <Field label={`Type "${activeWorkspace?.name}" to confirm`}>
              <input
                type="text"
                value={deleteWorkspaceConfirm}
                onChange={(e) => setDeleteWorkspaceConfirm(e.target.value)}
                style={inputStyle}
                placeholder={activeWorkspace?.name}
                autoFocus
              />
            </Field>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowDeleteWorkspace(false); setDeleteWorkspaceConfirm(""); }}
                className="flex-1 text-sm font-semibold py-2 rounded-xl"
                style={{ backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a" }}>
                Cancel
              </button>
              <button
                onClick={deleteWorkspace}
                disabled={deleteWorkspaceLoading || deleteWorkspaceConfirm !== activeWorkspace?.name}
                className="flex-1 text-sm font-semibold py-2 rounded-xl transition-opacity"
                style={{ backgroundColor: "#7f1d1d", color: "#fca5a5", opacity: (deleteWorkspaceLoading || deleteWorkspaceConfirm !== activeWorkspace?.name) ? 0.5 : 1 }}>
                {deleteWorkspaceLoading ? "Deleting…" : "Delete workspace"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete account confirm */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl p-6 modal-panel" style={{ backgroundColor: "#111111", border: "1px solid #3a1a1a" }}>
            <h2 className="text-base font-bold mb-1" style={{ color: "#f87171" }}>Delete your account?</h2>
            <div className="mb-4 rounded-xl p-3" style={{ backgroundColor: "#1a1000", border: "1px solid #5a3a00" }}>
              <p className="text-xs font-semibold" style={{ color: "#fbbf24" }}>Cancel your subscription first</p>
              <p className="text-xs mt-0.5" style={{ color: "#a07030" }}>
                If you have an active paid plan, cancel it in the Billing page before deleting your account. We cannot issue refunds after deletion.
              </p>
            </div>
            <p className="text-xs mb-5" style={{ color: "#aaaaaa" }}>
              All your workspaces, scheduled posts, and connected accounts will be permanently deleted. This cannot be undone.
            </p>
            {user?.hasPassword ? (
              <Field label="Your password">
                <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                  style={inputStyle} placeholder="••••••••" autoFocus />
              </Field>
            ) : (
              <Field label={`Type ${user?.email} to confirm`}>
                <input type="email" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                  style={inputStyle} placeholder={user?.email ?? "your@email.com"} autoFocus />
              </Field>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowDelete(false); setDeletePassword(""); }}
                className="flex-1 text-sm font-semibold py-2 rounded-xl"
                style={{ backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a" }}>
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleteLoading || (user?.hasPassword ? !deletePassword : deletePassword !== user?.email)}
                className="flex-1 text-sm font-semibold py-2 rounded-xl transition-opacity"
                style={{ backgroundColor: "#7f1d1d", color: "#fca5a5", opacity: (deleteLoading || (user?.hasPassword ? !deletePassword : deletePassword !== user?.email)) ? 0.5 : 1 }}>
                {deleteLoading ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
