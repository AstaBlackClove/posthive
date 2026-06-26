import type { Account } from "@prisma/client";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

/**
 * Threads adapter — NOT YET IMPLEMENTED.
 *
 * Threads uses Meta's Graph API with OAuth 2.0.
 * Before implementing:
 *   1. Register a Meta developer app and add "Threads API" as a product.
 *   2. Get app review approval for publishing scopes.
 *   3. Implement the OAuth callback route in apps/api/src/routes/accounts.ts.
 *
 * Publishing flow (two-step, unlike Bluesky):
 *   1. POST /{user-id}/threads — creates a media container, returns container_id.
 *   2. POST /{user-id}/threads_publish — publishes the container, returns thread_id.
 * Reply flow:
 *   1. POST /{user-id}/threads with reply_to_id={thread_id} — creates reply container.
 *   2. POST /{user-id}/threads_publish — publishes the reply.
 *
 * TODO: implement once Meta developer app is registered and approved.
 */
export const threadsAdapter: PlatformAdapter = {
  name: "threads",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    // TODO: exchange short-lived token for long-lived token if within 24h of expiry.
    throw new Error("Threads adapter not yet implemented");
  },

  async createPost(
    account: Account,
    content: { text: string; mediaUrls: string[] }
  ): Promise<PostResult> {
    // TODO: implement two-step Threads publish flow.
    throw new Error("Threads adapter not yet implemented");
  },

  async createComment(
    account: Account,
    replyContext: unknown,
    comment: string
  ): Promise<CommentResult> {
    // TODO: implement Threads reply using reply_to_id from replyContext.
    throw new Error("Threads adapter not yet implemented");
  },
};
