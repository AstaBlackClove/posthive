import { finalizeEvent, generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { Relay } from "nostr-tools/relay";
import { SimplePool } from "nostr-tools/pool";
import { decrypt, encrypt } from "../lib/encryption.js";
import { isSsrfBlocked } from "../lib/ssrf.js";
import type { Account } from "@prisma/client";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

// Default public relays — well-known, high-uptime
const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.snort.social",
];

interface NostrCredentials {
  nsec: string;   // hex private key (stored encrypted)
  npub: string;   // hex public key (display only)
  relays?: string[];
}

export function generateNostrKeypair(): { nsec: string; npub: string; nsecBech32: string; npubBech32: string } {
  const sk = generateSecretKey(); // Uint8Array
  const pk = getPublicKey(sk);
  const skHex = Buffer.from(sk).toString("hex");
  return {
    nsec: skHex,
    npub: pk,
    nsecBech32: nip19.nsecEncode(sk),
    npubBech32: nip19.npubEncode(pk),
  };
}

export function decodeNsec(nsecInput: string): { nsecHex: string; npubHex: string; npubBech32: string } {
  let skBytes: Uint8Array;
  if (nsecInput.startsWith("nsec1")) {
    const decoded = nip19.decode(nsecInput);
    if (decoded.type !== "nsec") throw new Error("Invalid nsec key");
    skBytes = decoded.data as Uint8Array;
  } else {
    // Treat as raw hex
    skBytes = Uint8Array.from(Buffer.from(nsecInput, "hex"));
  }
  const npubHex = getPublicKey(skBytes);
  return {
    nsecHex: Buffer.from(skBytes).toString("hex"),
    npubHex,
    npubBech32: nip19.npubEncode(npubHex),
  };
}

export async function fetchNostrProfile(
  npubHex: string,
  relays: string[] = DEFAULT_RELAYS
): Promise<{ name: string | null; picture: string | null }> {
  const pool = new SimplePool();
  try {
    const event = await Promise.race([
      pool.get(relays, { kinds: [0], authors: [npubHex] }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
    ]);
    if (!event) return { name: null, picture: null };

    const meta = JSON.parse(event.content) as { name?: string; display_name?: string; picture?: string };
    const name = meta.display_name?.trim() || meta.name?.trim() || null;

    let picture: string | null = meta.picture ?? null;
    if (picture) {
      try {
        if (isSsrfBlocked(picture)) { picture = null; }
        else {
          const check = await fetch(picture, { method: "HEAD", signal: AbortSignal.timeout(5_000) });
          if (!check.ok) picture = null;
        }
      } catch { picture = null; }
    }

    return { name, picture };
  } catch {
    return { name: null, picture: null };
  } finally {
    pool.close(relays);
  }
}

const RELAY_TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 3_000;

function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), RELAY_TIMEOUT_MS)),
  ]);
}

// One relay accepting the event counts as success. If every relay fails (relays rate-limit
// back-to-back publishes, e.g. a post followed by its first comment) wait briefly and retry
// once, then report each relay's reason so the failure is diagnosable.
async function publishToRelays(event: ReturnType<typeof finalizeEvent>, relays: string[]): Promise<void> {
  let results: PromiseSettledResult<void>[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    results = await Promise.allSettled(
      relays.map(async (url) => {
        const relay = await withTimeout(Relay.connect(url), "connect");
        try {
          await withTimeout(relay.publish(event), "publish");
        } finally {
          relay.close();
        }
      })
    );
    if (results.some((r) => r.status === "fulfilled")) return;
    if (attempt === 1) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  const reasons = results
    .map((r, i) => `${relays[i]}: ${r.status === "rejected" ? String(r.reason?.message ?? r.reason ?? "unknown") : "ok"}`)
    .join("; ");
  throw new Error(`Failed to publish to any Nostr relay (${reasons})`);
}

export const nostrAdapter: PlatformAdapter = {
  name: "nostr",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    return account; // Nostr uses keypairs — no token expiry
  },

  async createPost(account, content): Promise<PostResult> {
    const creds: NostrCredentials = JSON.parse(decrypt(account.credentials));
    const skBytes = Uint8Array.from(Buffer.from(creds.nsec, "hex"));
    const relays = creds.relays ?? DEFAULT_RELAYS;

    const imageUrls = content.mediaUrls ?? [];

    // Append image URLs to text — clients detect extensions and render inline
    const fullText = imageUrls.length
      ? `${content.text}\n\n${imageUrls.join("\n")}`
      : content.text;

    // NIP-92 imeta tags — increasingly supported (Damus, Amethyst, Snort)
    const tags: string[][] = imageUrls.map((url) => ["imeta", `url ${url}`]);

    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: fullText,
      },
      skBytes
    );

    await publishToRelays(event, relays);

    return {
      platformPostId: event.id,
      replyContext: { eventId: event.id, pubkey: event.pubkey, relays },
    };
  },

  async createComment(account, replyContext, comment): Promise<CommentResult> {
    const creds: NostrCredentials = JSON.parse(decrypt(account.credentials));
    const skBytes = Uint8Array.from(Buffer.from(creds.nsec, "hex"));
    const ctx = replyContext as { eventId: string; pubkey: string; relays: string[] };
    const relays = ctx.relays ?? DEFAULT_RELAYS;

    // NIP-10: reply to event using e and p tags
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["e", ctx.eventId, relays[0] ?? "", "reply"],
          ["p", ctx.pubkey],
        ],
        content: comment,
      },
      skBytes
    );

    await publishToRelays(event, relays);

    return { platformCommentId: event.id };
  },
};
