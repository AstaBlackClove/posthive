"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import type { ReactNode } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TIMEZONES: string[] = (Intl as any).supportedValuesOf("timeZone");

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}>
      <div className="mb-5">
        <h2 className="text-sm font-semibold" style={{ color: "#ededed" }}>{title}</h2>
        {description && <p className="text-xs mt-0.5" style={{ color: "#aaaaaa" }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "#aaaaaa" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  backgroundColor: "#0a0a0a",
  border: "1px solid #2a2a2a",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  color: "#ededed",
  outline: "none",
};

export default function SettingsPage() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [profileLoading, setProfileLoading] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="pl-16 pr-4 md:px-8 flex-shrink-0 flex items-center" style={{ height: 65, borderBottom: "1px solid #2a2a2a" }}>
        <div className="min-w-0">
          <h1 className="text-lg font-bold" style={{ color: "#ededed" }}>Settings</h1>
          <p className="text-xs mt-0.5 truncate hidden sm:block" style={{ color: "#aaaaaa" }}>Manage your account and preferences</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="space-y-5">
          {/* Top row: Profile + Password side by side on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Profile */}
          <Section title="Profile" description="Update your display name and email address.">
            <form onSubmit={saveProfile} className="space-y-4">
              <Field label="Name">
                <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Your name" />
              </Field>
              <Field label="Email">
                <input type="email" value={email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
              </Field>
              <Field label="Timezone">
                <select value={timezone} onChange={e => setTimezone(e.target.value)} style={inputStyle}>
                  {TIMEZONES.map(tz => (
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

          {/* Password */}
          <Section title="Password" description="Choose a strong password — at least 8 characters.">
            <form onSubmit={changePassword} className="space-y-4">
              <Field label="Current password">
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
              </Field>
              <Field label="New password">
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
              </Field>
              <Field label="Confirm new password">
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
              </Field>
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                  style={{ ...btnStyle, opacity: (pwLoading || !currentPassword || !newPassword || !confirmPassword) ? 0.5 : 1 }}>
                  {pwLoading ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </Section>

          </div>

          {/* Danger zone — full width below */}
          <Section title="Danger zone">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium" style={{ color: "#ededed" }}>Delete account</p>
                <p className="text-xs mt-0.5" style={{ color: "#aaaaaa" }}>
                  Permanently delete your account and all scheduled posts. This cannot be undone.
                </p>
              </div>
              <button onClick={() => setShowDelete(true)}
                className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0 self-start"
                style={{ backgroundColor: "#2a1010", color: "#f87171", border: "1px solid #5a2020" }}>
                Delete
              </button>
            </div>
          </Section>
        </div>
      </div>

      {/* Delete confirm modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl p-6 modal-panel" style={{ backgroundColor: "#111111", border: "1px solid #3a1a1a" }}>
            <h2 className="text-base font-bold mb-1" style={{ color: "#f87171" }}>Delete your account?</h2>
            <p className="text-xs mb-5" style={{ color: "#aaaaaa" }}>
              All your scheduled posts and connected accounts will be permanently deleted. Enter your password to confirm.
            </p>
            <Field label="Your password">
              <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
                style={inputStyle} placeholder="••••••••" autoFocus />
            </Field>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowDelete(false); setDeletePassword(""); }}
                className="flex-1 text-sm font-semibold py-2 rounded-xl"
                style={{ backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a" }}>
                Cancel
              </button>
              <button onClick={deleteAccount} disabled={deleteLoading || !deletePassword}
                className="flex-1 text-sm font-semibold py-2 rounded-xl transition-opacity"
                style={{ backgroundColor: "#7f1d1d", color: "#fca5a5", opacity: (deleteLoading || !deletePassword) ? 0.5 : 1 }}>
                {deleteLoading ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
