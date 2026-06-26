"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

interface Account {
  id: string;
  platform: string;
  displayName: string;
  createdAt: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState(false);

  async function fetchAccounts() {
    try {
      const data = await apiFetch<Account[]>("/accounts");
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAccounts(); }, []);

  async function connectBluesky(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true); setConnectError(null); setConnectSuccess(false);
    try {
      await apiFetch("/accounts/bluesky", {
        method: "POST",
        body: JSON.stringify({ handle: handle.replace(/^@/, ""), appPassword }),
      });
      setHandle(""); setAppPassword(""); setConnectSuccess(true);
      await fetchAccounts();
    } catch (err) {
      setConnectError(String(err));
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect(id: string, displayName: string) {
    if (!confirm(`Disconnect ${displayName}? This won't affect already-scheduled jobs.`)) return;
    await apiFetch(`/accounts/${id}`, { method: "DELETE" });
    await fetchAccounts();
  }

  const blueskyAccounts = accounts.filter((a) => a.platform === "bluesky");

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <p className="text-gray-500 text-sm mt-1">Connect your social accounts to start scheduling.</p>
      </div>

      <div className="space-y-6">

        {/* Bluesky */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <span className="text-2xl">🦋</span>
            <div>
              <h2 className="font-semibold text-gray-900">Bluesky</h2>
              <p className="text-xs text-gray-400">Uses app passwords — no OAuth needed</p>
            </div>
            <span className="ml-auto text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-0.5 rounded-full">Live</span>
          </div>

          <div className="p-6 space-y-4">
            {/* Connected accounts */}
            {!loading && blueskyAccounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                  {a.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.displayName}</p>
                  <p className="text-xs text-gray-400">Connected {new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => disconnect(a.id, a.displayName)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ))}

            {/* Connect form */}
            <form onSubmit={connectBluesky} className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {blueskyAccounts.length > 0 ? "Connect another account" : "Connect your account"}
              </p>
              <input
                placeholder="Handle (e.g. yourname.bsky.social)"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <input
                type="password"
                placeholder="App Password — from bsky.app → Settings → App Passwords"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              {connectError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{connectError}</p>
              )}
              {connectSuccess && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ Account connected successfully</p>
              )}
              <button
                type="submit"
                disabled={connecting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {connecting ? "Connecting…" : "Connect Bluesky Account"}
              </button>
            </form>
          </div>
        </div>

        {/* Threads */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden opacity-60">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <span className="text-2xl">🧵</span>
            <div>
              <h2 className="font-semibold text-gray-900">Threads</h2>
              <p className="text-xs text-gray-400">Requires Meta developer app + review</p>
            </div>
            <span className="ml-auto text-xs bg-gray-100 text-gray-500 font-semibold px-2.5 py-0.5 rounded-full">Coming soon</span>
          </div>
          <div className="p-6">
            <button disabled className="w-full py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-not-allowed">
              Connect Threads Account
            </button>
          </div>
        </div>

        {/* LinkedIn */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden opacity-60">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <span className="text-2xl">💼</span>
            <div>
              <h2 className="font-semibold text-gray-900">LinkedIn</h2>
              <p className="text-xs text-gray-400">Requires LinkedIn developer app registration + approval</p>
            </div>
            <span className="ml-auto text-xs bg-gray-100 text-gray-500 font-semibold px-2.5 py-0.5 rounded-full">Coming soon</span>
          </div>
          <div className="p-6">
            <button disabled className="w-full py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-not-allowed">
              Connect LinkedIn Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
