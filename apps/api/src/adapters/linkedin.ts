import type { Account } from "@prisma/client";
import type { CommentResult, PlatformAdapter, PostResult } from "./types.js";

/**
 * LinkedIn adapter — NOT YET IMPLEMENTED.
 *
 * LinkedIn uses OAuth 2.0 with the "w_member_social" scope for posting.
 * Before implementing:
 *   1. Register a LinkedIn developer app at https://developer.linkedin.com
 *   2. Request access to the "Share on LinkedIn" and "Community Management API"
 *      products — this requires a manual review that can take several days.
 *   3. Implement the OAuth callback route in apps/api/src/routes/accounts.ts.
 *
 * Publishing flow (REST API v2):
 *   POST /ugcPosts with author="urn:li:person:{id}", lifecycleState="PUBLISHED"
 * Comment flow:
 *   POST /socialActions/{shareUrn}/comments
 *
 * TODO: implement once the LinkedIn developer app is registered and approved.
 */
export const linkedinAdapter: PlatformAdapter = {
  name: "linkedin",

  async refreshTokenIfNeeded(account: Account): Promise<Account> {
    // TODO: refresh OAuth access token using the refresh token before expiry.
    throw new Error("LinkedIn adapter not yet implemented");
  },

  async createPost(
    account: Account,
    content: { text: string; mediaUrls: string[] }
  ): Promise<PostResult> {
    // TODO: implement LinkedIn UGC post creation.
    throw new Error("LinkedIn adapter not yet implemented");
  },

  async createComment(
    account: Account,
    replyContext: unknown,
    comment: string
  ): Promise<CommentResult> {
    // TODO: implement LinkedIn comment creation using shareUrn from replyContext.
    throw new Error("LinkedIn adapter not yet implemented");
  },
};
