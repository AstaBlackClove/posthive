"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { cn } from "../../lib/cn";

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
    <div className="card overflow-hidden">
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="mt-0.5 shrink-0 text-brand-800">{icon}</div>
      <div>
        <h2 className="type-body-sb-s text-fg">{title}</h2>
        <p className="mt-0.5 type-body-r-xs text-muted">{description}</p>
      </div>
    </div>
  );
}

function UpgradeGate({ description }: { description: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg px-4.5 py-4">
      <p className="mb-1 type-body-sb-s text-fg">Pro &amp; Team feature</p>
      <p className="mb-3 type-body-r-xs text-muted">{description}</p>
      <a href="/billing" className="btn-primary rounded-md px-3.5 py-1.5 type-body-sb-xs">
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
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="type-body-sb-l text-fg">Integrations</h1>
          <p className="type-body-r-xs mt-0.5 hidden sm:block text-muted">Connect Posthive to your tools and workflows</p>
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
                <label className="mb-1.5 block type-body-r-xs text-muted">Key name</label>
                <div className="flex gap-2">
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. My Claude agent"
                    className="field flex-1 rounded-lg"
                  />
                  <button type="submit" disabled={creatingKey || !newKeyName.trim()}
                    className="btn-primary whitespace-nowrap rounded-lg px-4.5">
                    {creatingKey ? "Creating…" : "Create key"}
                  </button>
                </div>
              </form>

              {newKeyRaw && (
                <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="type-body-sb-xs text-green-700">Copy your key — it won&apos;t be shown again</p>
                    <button onClick={() => setNewKeyRaw(null)} className="cursor-pointer type-body-r-xs text-muted hover:text-fg">Dismiss</button>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                    <code className="flex-1 break-all type-mono-r-xs text-fg">{newKeyRaw}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(newKeyRaw); toast("Copied!", "success"); }}
                      className="btn-secondary shrink-0 gap-1.5 rounded-lg px-2.5 py-1 type-body-sb-xs">
                      <CopyIcon /> Copy
                    </button>
                  </div>
                </div>
              )}

              {apiKeys.length === 0 ? (
                <div className="pt-5 pb-1 text-center">
                  <p className="mb-1 type-body-r-s text-muted">No API keys yet</p>
                  <p className="type-body-r-xs text-neutral-500">Create a key to start scheduling posts via the REST API or MCP.</p>
                </div>
              ) : (
                <div className="border-t border-border pt-4">
                  <p className="section-label mb-2.5">Active keys</p>
                  <div className="space-y-2">
                    {apiKeys.map((k) => (
                      <div key={k.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border border-border bg-bg">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-2 shrink-0 rounded-full bg-green-500" />
                          <div className="min-w-0">
                            <p className="type-body-m-s text-fg">{k.name}</p>
                            <p className="type-mono-r-xs text-muted">
                              {k.prefix}… · {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "never used"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setConfirmRevokeId(k.id)}
                          disabled={revokingId === k.id}
                          className="btn-secondary shrink-0 rounded-lg border-red-200 bg-red-50 px-3.5 py-1.5 type-body-sb-xs text-red-600 hover:bg-red-100">
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
              <div className="mt-0.5 shrink-0 text-brand-800"><WebhookIcon /></div>
              <div>
                <h2 className="type-body-sb-s text-fg">Webhook</h2>
                <p className="mt-0.5 type-body-r-xs text-muted">Receive a POST request every time a post publishes.</p>
              </div>
            </div>
            {!webhookLocked && (
              <div className="flex items-center gap-1.5 shrink-0 ml-4 mt-0.5">
                <div className={cn("size-2 rounded-full", webhookConnected ? "bg-green-500" : "bg-neutral-300")} />
                <span className={cn("type-body-r-xs", webhookConnected ? "text-green-700" : "text-muted")}>
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
                <label className="mb-1.5 block type-body-r-xs text-muted">Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/…"
                  className={cn("field rounded-lg", webhookUrl.trim() && !validWebhookUrl && "border-red-300")}
                />
                {webhookUrl.trim() && !validWebhookUrl && (
                  <p className="mt-1.5 type-body-r-xs text-red-600">URL must start with http:// or https://</p>
                )}
              </div>

              {/* Works with */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="type-body-r-xs text-muted">Works with</span>
                {["Zapier", "n8n", "Make"].map((name) => (
                  <span key={name} className="rounded-md border border-border bg-bg px-2 py-0.5 type-body-r-xs text-muted">{name}</span>
                ))}
              </div>

              {/* Payload example */}
              <div className="overflow-hidden rounded-xl border border-border bg-bg">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <span className="type-body-r-xs text-muted">Payload example</span>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(PAYLOAD_EXAMPLE); toast("Copied!", "success"); }}
                    className="flex items-center gap-1 cursor-pointer type-body-r-xs text-muted hover:text-fg">
                    <CopyIcon /> Copy
                  </button>
                </div>
                <pre className="overflow-x-auto px-4 py-3 type-mono-r-xs text-fg">
                  {PAYLOAD_EXAMPLE}
                </pre>
              </div>

              <div className="flex justify-between items-center pt-1">
                {webhookUrl.trim() ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteWebhook(true)}
                    className="btn-secondary rounded-lg border-red-200 bg-red-50 px-3.5 py-1.5 type-body-sb-xs text-red-600 hover:bg-red-100">
                    Remove webhook
                  </button>
                ) : <span />}
                <button type="submit" disabled={webhookLoading || !webhookUrl.trim() || !validWebhookUrl}
                  className="btn-primary whitespace-nowrap rounded-lg px-4.5">
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
          <div className="card w-full max-w-sm border-red-200 p-6 modal-panel">
            <h2 className="mb-1.5 type-body-sb-m text-red-600">Remove webhook?</h2>
            <p className="mb-5 type-body-r-s text-muted">
              Posthive will stop sending publish events. You can re-add it at any time.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteWebhook(false)}
                className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={deleteWebhook} disabled={webhookLoading}
                className="btn-danger flex-1">
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
            <div className="card w-full max-w-sm border-red-200 p-6 modal-panel">
              <h2 className="mb-1.5 type-body-sb-m text-red-600">Revoke API key?</h2>
              <p className="mb-5 type-body-r-s text-muted">
                <strong className="text-fg">{key?.name}</strong> (<span className="type-mono-r-s">{key?.prefix}…</span>) will stop working immediately.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmRevokeId(null)}
                  className="btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={() => revokeApiKey(confirmRevokeId)}
                  className="btn-danger flex-1">
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
