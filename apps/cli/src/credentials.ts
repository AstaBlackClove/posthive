/**
 * Shared credential store for posthive-cli.
 *
 * Stores the API key from `posthive login` in ~/.posthive/config.json
 * (mode 0600 — owner read/write only). posthive-mcp reads the same file
 * as a fallback when POSTHIVE_API_KEY isn't set in the environment.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, mkdir, unlink, chmod } from "node:fs/promises";

export interface StoredCredentials {
  apiKey: string;
  apiUrl: string;
  email?: string;
}

function configDir(): string {
  return join(homedir(), ".posthive");
}

function configPath(): string {
  return join(configDir(), "config.json");
}

export async function readCredentials(): Promise<StoredCredentials | null> {
  try {
    const raw = await readFile(configPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.apiKey === "string" && typeof parsed?.apiUrl === "string") {
      return parsed as StoredCredentials;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeCredentials(creds: StoredCredentials): Promise<void> {
  await mkdir(configDir(), { recursive: true });
  await writeFile(configPath(), JSON.stringify(creds, null, 2), "utf-8");
  try {
    await chmod(configPath(), 0o600);
  } catch {
    // chmod may not be meaningful on some filesystems (e.g. Windows) — best effort
  }
}

export async function clearCredentials(): Promise<boolean> {
  try {
    await unlink(configPath());
    return true;
  } catch {
    return false;
  }
}
