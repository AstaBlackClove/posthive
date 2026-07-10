/**
 * Browser-based OAuth login for posthive-cli.
 *
 * Reuses the existing Posthive OAuth 2.0 Authorization Code + PKCE server
 * (built for the Claude.ai MCP connector) via the standard CLI "loopback"
 * pattern: spin up a local HTTP server, open the browser to /oauth/authorize
 * with a 127.0.0.1 redirect_uri, and receive the code on that local server —
 * same approach used by gh, vercel, and gcloud CLIs. No API key copy-paste.
 */

import { randomBytes, createHash } from "node:crypto";
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { writeCredentials, clearCredentials, readCredentials } from "./credentials.js";

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? `open "${url}"`
    : process.platform === "win32" ? `start "" "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {}); // best-effort; URL is always printed as a fallback
}

const SUCCESS_HTML = `<!DOCTYPE html><html><head><title>Posthive</title><style>
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#ededed;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{text-align:center}
h1{font-size:20px;margin-bottom:8px}
p{color:#888;font-size:14px}
</style></head><body><div class="card"><h1>&#10003; Logged in to Posthive</h1><p>You can close this window and return to your terminal.</p></div></body></html>`;

const DENIED_HTML = `<!DOCTYPE html><html><head><title>Posthive</title><style>
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#ededed;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{text-align:center}
h1{font-size:20px;margin-bottom:8px;color:#ef4444}
p{color:#888;font-size:14px}
</style></head><body><div class="card"><h1>Login cancelled</h1><p>You can close this window.</p></div></body></html>`;

export async function runLogin(apiUrl: string): Promise<void> {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  const state = base64url(randomBytes(16));

  let redirectUri = "";

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }

      const returnedState = url.searchParams.get("state");
      const authCode = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      const shutdown = () => { server.close(); server.closeAllConnections(); };

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html", "Connection": "close" });
        res.end(DENIED_HTML, () => shutdown());
        reject(new Error(url.searchParams.get("error_description") ?? error));
        return;
      }

      if (!authCode || returnedState !== state) {
        res.writeHead(400, { "Content-Type": "text/html", "Connection": "close" });
        res.end(DENIED_HTML, () => shutdown());
        reject(new Error("State mismatch or missing authorization code."));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html", "Connection": "close" });
      res.end(SUCCESS_HTML, () => shutdown());
      resolve(authCode);
    });

    server.on("error", reject);

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to start local login server"));
        return;
      }

      redirectUri = `http://127.0.0.1:${address.port}/callback`;
      const authorizeUrl = new URL(`${apiUrl}/oauth/authorize`);
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("code_challenge", challenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");
      authorizeUrl.searchParams.set("state", state);
      authorizeUrl.searchParams.set("client_id", "Posthive CLI");

      process.stdout.write("Opening browser to sign in...\n");
      process.stdout.write(`If it doesn't open automatically, visit:\n${authorizeUrl.toString()}\n\n`);
      openBrowser(authorizeUrl.toString());

      const timer = setTimeout(() => {
        server.close();
        reject(new Error("Login timed out after 5 minutes. Run `posthive login` again."));
      }, LOGIN_TIMEOUT_MS);
      timer.unref();
    });
  });

  let tokenRes: Response;
  try {
    tokenRes = await fetch(`${apiUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
        redirect_uri: redirectUri,
      }),
    });
  } catch (err) {
    const cause = err instanceof Error && err.cause instanceof Error ? `: ${err.cause.message}` : "";
    throw new Error(
      `Could not reach ${apiUrl}${cause}. This is usually a network/firewall/proxy issue on your machine ` +
      `blocking Node.js from making HTTPS requests (even if your browser can reach the site fine). ` +
      `If you're behind a corporate proxy or antivirus with TLS inspection, try setting NODE_EXTRA_CA_CERTS ` +
      `to your organization's root CA, or run from a different network.`
    );
  }

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  const { access_token: apiKey } = (await tokenRes.json()) as { access_token: string };

  let email: string | undefined;
  try {
    const meRes = await fetch(`${apiUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (meRes.ok) {
      const { user } = (await meRes.json()) as { user: { email: string } };
      email = user.email;
    }
  } catch {
    // Non-fatal — login still succeeds without the email confirmation
  }

  await writeCredentials({ apiKey, apiUrl, email });
  process.stdout.write(`✓ Logged in${email ? ` as ${email}` : ""}\n`);
}

export async function runLogout(): Promise<void> {
  const existing = await readCredentials();
  const cleared = await clearCredentials();
  if (cleared) {
    process.stdout.write(`✓ Logged out${existing?.email ? ` (${existing.email})` : ""}\n`);
  } else {
    process.stdout.write("Not logged in.\n");
  }
}
