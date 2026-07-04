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

  // API Keys
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string }[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [confirmDeleteWebhook, setConfirmDeleteWebhook] = useState(false);
  const [webhookLocked, setWebhookLocked] = useState(false);

  useEffect(() => {
    apiFetch<{ keys: typeof apiKeys }>("/user/api-keys")
      .then((d) => setApiKeys(d.keys ?? []))
      .catch(() => {});
    apiFetch<{ webhookUrl: string | null; locked: boolean }>("/user/webhook")
      .then((d) => { setWebhookUrl(d.webhookUrl ?? ""); setWebhookLocked(d.locked ?? false); })
      .catch(() => {});
  }, []);

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

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const data = await apiFetch<{ key: string; prefix: string; name: string }>("/user/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      setNewKeyRaw(data.key);
      setNewKeyName("");
      // Refresh list to get the real id
      apiFetch<{ keys: typeof apiKeys }>("/user/api-keys").then((d) => setApiKeys(d.keys ?? [])).catch(() => {});
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create key", "error");
    } finally {
      setCreatingKey(false);
    }
  }

  async function revokeApiKey(id: string) {
    setConfirmRevokeId(null);
    setRevokingId(id);
    try {
      await apiFetch<{ ok: boolean }>(`/user/api-keys/${id}`, { method: "DELETE" });
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast("API key revoked", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to revoke key", "error");
    } finally {
      setRevokingId(null);
    }
  }

  async function saveWebhook(e: React.FormEvent) {
    e.preventDefault();
    setWebhookLoading(true);
    try {
      await apiFetch("/user/webhook", { method: "PATCH", body: JSON.stringify({ webhookUrl: webhookUrl.trim() || null }) });
      toast("Webhook URL saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save webhook", "error");
    } finally {
      setWebhookLoading(false);
    }
  }

  async function deleteWebhook() {
    setWebhookLoading(true);
    try {
      await apiFetch("/user/webhook", { method: "PATCH", body: JSON.stringify({ webhookUrl: null }) });
      setWebhookUrl("");
      setConfirmDeleteWebhook(false);
      toast("Webhook removed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to remove webhook", "error");
    } finally {
      setWebhookLoading(false);
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

          {/* API Keys */}
          <Section title="API Keys" description="Create keys to schedule posts programmatically. Pro and Team plans only.">
            {/* Create new key */}
            <form onSubmit={createApiKey} className="flex gap-2 mb-4">
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. My Claude agent)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="submit" disabled={creatingKey || !newKeyName.trim()}
                style={{ ...btnStyle, opacity: (creatingKey || !newKeyName.trim()) ? 0.5 : 1, whiteSpace: "nowrap" }}>
                {creatingKey ? "Creating…" : "Create key"}
              </button>
            </form>

            {/* One-time key reveal */}
            {newKeyRaw && (
              <div className="mb-4 rounded-xl p-4" style={{ backgroundColor: "#0d1f0d", border: "1px solid #1a4a1a" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#4ade80" }}>Copy your key now — it won&apos;t be shown again</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs break-all flex-1" style={{ color: "#a7f3d0", fontFamily: "monospace" }}>{newKeyRaw}</code>
                  <button onClick={() => { navigator.clipboard.writeText(newKeyRaw); toast("Copied!", "success"); }}
                    style={{ ...btnStyle, padding: "4px 10px", fontSize: 11, flexShrink: 0 }}>
                    Copy
                  </button>
                </div>
                <button onClick={() => setNewKeyRaw(null)} className="text-xs mt-2" style={{ color: "#888" }}>Dismiss</button>
              </div>
            )}

            {/* Existing keys list */}
            {apiKeys.length === 0 ? (
              <p className="text-xs" style={{ color: "#555" }}>No API keys yet.</p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                    style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a" }}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#ededed" }}>{k.name}</p>
                      <p className="text-xs" style={{ color: "#555", fontFamily: "monospace" }}>
                        {k.prefix}… · {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "never used"}
                      </p>
                    </div>
                    <button
                      onClick={() => setConfirmRevokeId(k.id)}
                      disabled={revokingId === k.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: "#2a1010", color: "#f87171", border: "1px solid #5a2020", opacity: revokingId === k.id ? 0.5 : 1 }}>
                      {revokingId === k.id ? "Revoking…" : "Revoke"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Webhook */}
          <Section title="Webhook" description="Posthive will POST to this URL every time a post is published. Leave blank to disable.">
            {webhookLocked ? (
              <div className="rounded-xl px-4 py-5 flex flex-col gap-2 items-start" style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a" }}>
                <p className="text-sm font-semibold" style={{ color: "#ededed" }}>Pro & Team feature</p>
                <p className="text-xs" style={{ color: "#888" }}>Upgrade to Pro or Team to connect a webhook and integrate with n8n, Zapier, or Make.</p>
                <a href="/billing" className="mt-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#5b63d3", color: "#fff" }}>Upgrade plan</a>
              </div>
            ) : (
            <form onSubmit={saveWebhook} className="space-y-4">
              <Field label="Webhook URL">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/…"
                  style={{
                    ...inputStyle,
                    borderColor: webhookUrl.trim() && !/^https?:\/\/.+/.test(webhookUrl.trim()) ? "#ef4444" : "#2a2a2a",
                  }}
                />
                {webhookUrl.trim() && !/^https?:\/\/.+/.test(webhookUrl.trim()) && (
                  <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>Invalid URL — must start with http:// or https://</p>
                )}
              </Field>
              <div className="rounded-xl px-4 py-3 text-xs space-y-1" style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", color: "#888" }}>
                <p className="font-semibold" style={{ color: "#aaa" }}>Payload example</p>
                <pre className="overflow-x-auto" style={{ fontFamily: "monospace", fontSize: 11, color: "#666" }}>{`{
  "event": "post.published",
  "postId": "clxyz…",
  "status": "done",
  "scheduledFor": "2026-07-04T10:00:00.000Z",
  "platforms": ["bluesky", "threads"],
  "text": "Hello world!"
}`}</pre>
              </div>
              <div className="flex justify-between items-center pt-1">
                {webhookUrl.trim() ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteWebhook(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: "#2a1010", color: "#f87171", border: "1px solid #5a2020" }}
                  >
                    Remove webhook
                  </button>
                ) : <span />}
                <button type="submit" disabled={webhookLoading || !webhookUrl.trim() || !/^https?:\/\/.+/.test(webhookUrl.trim())} style={{ ...btnStyle, opacity: (webhookLoading || !webhookUrl.trim() || !/^https?:\/\/.+/.test(webhookUrl.trim())) ? 0.5 : 1 }}>
                  {webhookLoading ? "Saving…" : "Save webhook"}
                </button>
              </div>
            </form>
            )}
          </Section>

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

      {/* Remove webhook confirm modal */}
      {confirmDeleteWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl p-6 modal-panel" style={{ backgroundColor: "#111111", border: "1px solid #3a1a1a" }}>
            <h2 className="text-base font-bold mb-1" style={{ color: "#f87171" }}>Remove webhook?</h2>
            <p className="text-xs mb-5" style={{ color: "#aaaaaa" }}>
              Posthive will stop sending publish events to your webhook URL. You can re-add it at any time.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteWebhook(false)}
                className="flex-1 text-sm font-semibold py-2 rounded-xl"
                style={{ backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a" }}>
                Cancel
              </button>
              <button onClick={deleteWebhook} disabled={webhookLoading}
                className="flex-1 text-sm font-semibold py-2 rounded-xl transition-opacity"
                style={{ backgroundColor: "#7f1d1d", color: "#fca5a5", opacity: webhookLoading ? 0.5 : 1 }}>
                {webhookLoading ? "Removing…" : "Remove webhook"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke API key confirm modal */}
      {confirmRevokeId && (() => {
        const key = apiKeys.find((k) => k.id === confirmRevokeId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
            <div className="w-full max-w-sm rounded-2xl p-6 modal-panel" style={{ backgroundColor: "#111111", border: "1px solid #3a1a1a" }}>
              <h2 className="text-base font-bold mb-1" style={{ color: "#f87171" }}>Revoke API key?</h2>
              <p className="text-xs mb-5" style={{ color: "#aaaaaa" }}>
                <strong style={{ color: "#ededed" }}>{key?.name}</strong> (<span style={{ fontFamily: "monospace" }}>{key?.prefix}…</span>) will stop working immediately. Any agent or script using it will lose access.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmRevokeId(null)}
                  className="flex-1 text-sm font-semibold py-2 rounded-xl"
                  style={{ backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a" }}>
                  Cancel
                </button>
                <button onClick={() => revokeApiKey(confirmRevokeId)}
                  className="flex-1 text-sm font-semibold py-2 rounded-xl"
                  style={{ backgroundColor: "#7f1d1d", color: "#fca5a5" }}>
                  Revoke key
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
