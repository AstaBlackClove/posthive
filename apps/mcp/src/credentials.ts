/**
 * Reads the shared credential store written by `posthive login` (posthive-cli).
 * Lets posthive-mcp work without POSTHIVE_API_KEY set in the MCP client config,
 * as long as the user has already run `npx posthive-cli login` once.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

export interface StoredCredentials {
  apiKey: string;
  apiUrl: string;
  email?: string;
}

export async function readCredentials(): Promise<StoredCredentials | null> {
  try {
    const raw = await readFile(join(homedir(), ".posthive", "config.json"), "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.apiKey === "string" && typeof parsed?.apiUrl === "string") {
      return parsed as StoredCredentials;
    }
    return null;
  } catch {
    return null;
  }
}
