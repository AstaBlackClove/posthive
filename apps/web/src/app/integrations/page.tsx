"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../components/Toast";

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#0a0a0a",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "#ededed",
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#0a0a0a",
  border: "none",
  borderRadius: 8,
  padding: "9px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnDanger: React.CSSProperties = {
  backgroundColor: "#2a1010",
  color: "#f87171",
  border: "1px solid #5a2020",
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const PAYLOAD_EXAMPLE = `{
  "event": "post.published",
  "postId": "clxyz…",
  "status": "done",
  "scheduledFor": "2026-07-04T10:00:00.000Z",
  "platforms": ["bluesky", "threads"],
  "text": "Hello world!"
}`;

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  );
}

function WebhookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: "#111111",
      border: "1px solid #2a2a2a",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      <div style={{ padding: 24 }}>
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div style={{ color: "#5b63d3", marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#ededed", margin: 0 }}>{title}</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{description}</p>
      </div>
    </div>
  );
}

function UpgradeGate({ description }: { description: string }) {
  return (
    <div style={{ backgroundColor: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "16px 18px" }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#ededed", marginBottom: 4 }}>Pro &amp; Team feature</p>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>{description}</p>
      <a href="/billing" style={{ display: "inline-block", fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 7, backgroundColor: "#5b63d3", color: "#fff", textDecoration: "none" }}>
        Upgrade plan
      </a>
    </div>
  );
}

export default function IntegrationsPage() {
  const { toast } = useToast();

  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string }[]>([]);
  const [apiKeysLocked, setApiKeysLocked] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [confirmDeleteWebhook, setConfirmDeleteWebhook] = useState(false);
  const [webhookLocked, setWebhookLocked] = useState(false);

  useEffect(() => {
    apiFetch<{ keys: typeof apiKeys; locked: boolean }>("/user/api-keys")
      .then((d) => { setApiKeys(d.keys ?? []); setApiKeysLocked(d.locked ?? false); })
      .catch(() => {});
    apiFetch<{ webhookUrl: string | null; locked: boolean }>("/user/webhook")
      .then((d) => { setWebhookUrl(d.webhookUrl ?? ""); setWebhookLocked(d.locked ?? false); })
      .catch(() => {});
  }, []);

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

  const validWebhookUrl = /^https?:\/\/.+/.test(webhookUrl.trim());
  const webhookConnected = webhookUrl.trim() && validWebhookUrl;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="pl-16 pr-4 md:px-8 flex-shrink-0 flex items-center" style={{ height: 65, borderBottom: "1px solid #2a2a2a" }}>
        <div className="min-w-0">
          <h1 className="text-lg font-bold" style={{ color: "#ededed" }}>Integrations</h1>
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "#888" }}>Connect Posthive to your tools and workflows</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">

        {/* API Keys */}
        <SectionCard>
          <SectionHeader
            icon={<KeyIcon />}
            title="API Keys"
            description="Schedule and manage posts programmatically. Pro and Team plans only."
          />

          {apiKeysLocked ? (
            <UpgradeGate description="Upgrade to Pro or Team to create API keys and automate posting." />
          ) : (
            <>
              <form onSubmit={createApiKey} className="space-y-2 mb-5">
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Key name</label>
                <div className="flex gap-2">
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. My Claude agent"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button type="submit" disabled={creatingKey || !newKeyName.trim()}
                    style={{ ...btnPrimary, opacity: (creatingKey || !newKeyName.trim()) ? 0.45 : 1 }}>
                    {creatingKey ? "Creating…" : "Create key"}
                  </button>
                </div>
              </form>

              {newKeyRaw && (
                <div className="mb-5 rounded-xl p-4" style={{ backgroundColor: "#0a1a0a", border: "1px solid #1a3a1a" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>Copy your key — it won&apos;t be shown again</p>
                    <button onClick={() => setNewKeyRaw(null)} style={{ fontSize: 11, color: "#555", background: "none", border: "none", cursor: "pointer" }}>Dismiss</button>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "#0a0a0a", border: "1px solid #1a3a1a" }}>
                    <code style={{ fontSize: 12, color: "#a7f3d0", fontFamily: "monospace", flex: 1, wordBreak: "break-all" }}>{newKeyRaw}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(newKeyRaw); toast("Copied!", "success"); }}
                      className="flex items-center gap-1.5 flex-shrink-0"
                      style={{ ...btnPrimary, padding: "5px 10px", fontSize: 12 }}>
                      <CopyIcon /> Copy
                    </button>
                  </div>
                </div>
              )}

              {apiKeys.length === 0 ? (
                <div style={{ padding: "20px 0 4px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "#444", marginBottom: 4 }}>No API keys yet</p>
                  <p style={{ fontSize: 12, color: "#333" }}>Create a key to start scheduling posts via the REST API or MCP.</p>
                </div>
              ) : (
                <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: 16 }}>
                  <p style={{ fontSize: 11, color: "#555", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active keys</p>
                  <div className="space-y-2">
                    {apiKeys.map((k) => (
                      <div key={k.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                        style={{ backgroundColor: "#0a0a0a", border: "1px solid #222" }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#22c55e", flexShrink: 0 }} />
                          <div className="min-w-0">
                            <p style={{ fontSize: 13, fontWeight: 500, color: "#ededed", margin: 0 }}>{k.name}</p>
                            <p style={{ fontSize: 11, color: "#555", fontFamily: "monospace", margin: 0 }}>
                              {k.prefix}… · {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "never used"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setConfirmRevokeId(k.id)}
                          disabled={revokingId === k.id}
                          style={{ ...btnDanger, opacity: revokingId === k.id ? 0.5 : 1, flexShrink: 0 }}>
                          {revokingId === k.id ? "Revoking…" : "Revoke"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* Webhook */}
        <SectionCard>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-start gap-3">
              <div style={{ color: "#5b63d3", marginTop: 2, flexShrink: 0 }}><WebhookIcon /></div>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#ededed", margin: 0 }}>Webhook</h2>
                <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Receive a POST request every time a post publishes.</p>
              </div>
            </div>
            {!webhookLocked && (
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-4" style={{ marginTop: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: webhookConnected ? "#22c55e" : "#333" }} />
                <span style={{ fontSize: 11, color: webhookConnected ? "#4ade80" : "#555" }}>
                  {webhookConnected ? "Connected" : "Not connected"}
                </span>
              </div>
            )}
          </div>

          {webhookLocked ? (
            <UpgradeGate description="Upgrade to Pro or Team to connect a webhook and integrate with n8n, Zapier, or Make." />
          ) : (
            <form onSubmit={saveWebhook} className="space-y-4">
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/…"
                  style={{
                    ...inputStyle,
                    borderColor: webhookUrl.trim() && !validWebhookUrl ? "#ef4444" : "#2a2a2a",
                  }}
                />
                {webhookUrl.trim() && !validWebhookUrl && (
                  <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>URL must start with http:// or https://</p>
                )}
              </div>

              {/* Works with */}
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 11, color: "#555" }}>Works with</span>
                {["Zapier", "n8n", "Make"].map((name) => (
                  <span key={name} style={{ fontSize: 11, color: "#888", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 5, padding: "2px 8px" }}>{name}</span>
                ))}
              </div>

              {/* Payload example */}
              <div style={{ backgroundColor: "#0a0a0a", border: "1px solid #222", borderRadius: 10, overflow: "hidden" }}>
                <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid #1e1e1e" }}>
                  <span style={{ fontSize: 11, color: "#555" }}>Payload example</span>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(PAYLOAD_EXAMPLE); toast("Copied!", "success"); }}
                    className="flex items-center gap-1"
                    style={{ fontSize: 11, color: "#555", background: "none", border: "none", cursor: "pointer" }}>
                    <CopyIcon /> Copy
                  </button>
                </div>
                <pre style={{ fontFamily: "monospace", fontSize: 12, color: "#666", margin: 0, padding: "12px 16px", overflowX: "auto", lineHeight: 1.6 }}>
                  {PAYLOAD_EXAMPLE}
                </pre>
              </div>

              <div className="flex justify-between items-center pt-1">
                {webhookUrl.trim() ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteWebhook(true)}
                    style={btnDanger}>
                    Remove webhook
                  </button>
                ) : <span />}
                <button type="submit" disabled={webhookLoading || !webhookUrl.trim() || !validWebhookUrl}
                  style={{ ...btnPrimary, opacity: (webhookLoading || !webhookUrl.trim() || !validWebhookUrl) ? 0.45 : 1 }}>
                  {webhookLoading ? "Saving…" : "Save webhook"}
                </button>
              </div>
            </form>
          )}
        </SectionCard>
      </div>

      {/* Remove webhook confirm */}
      {confirmDeleteWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-sm rounded-2xl p-6 modal-panel" style={{ backgroundColor: "#111111", border: "1px solid #3a1a1a" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>Remove webhook?</h2>
            <p style={{ fontSize: 13, color: "#aaaaaa", marginBottom: 20 }}>
              Posthive will stop sending publish events. You can re-add it at any time.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteWebhook(false)}
                className="flex-1 text-sm font-semibold py-2 rounded-xl"
                style={{ backgroundColor: "#1a1a1a", color: "#ededed", border: "1px solid #2a2a2a" }}>
                Cancel
              </button>
              <button onClick={deleteWebhook} disabled={webhookLoading}
                className="flex-1 text-sm font-semibold py-2 rounded-xl"
                style={{ backgroundColor: "#7f1d1d", color: "#fca5a5", opacity: webhookLoading ? 0.5 : 1 }}>
                {webhookLoading ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke API key confirm */}
      {confirmRevokeId && (() => {
        const key = apiKeys.find((k) => k.id === confirmRevokeId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
            <div className="w-full max-w-sm rounded-2xl p-6 modal-panel" style={{ backgroundColor: "#111111", border: "1px solid #3a1a1a" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>Revoke API key?</h2>
              <p style={{ fontSize: 13, color: "#aaaaaa", marginBottom: 20 }}>
                <strong style={{ color: "#ededed" }}>{key?.name}</strong> (<span style={{ fontFamily: "monospace" }}>{key?.prefix}…</span>) will stop working immediately.
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
    </div>
  );
}
