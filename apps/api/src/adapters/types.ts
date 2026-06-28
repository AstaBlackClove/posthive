import type { Account } from "@prisma/client";

export type { Account };

/**
 * What createPost returns. platformPostId is stored on PostJobTarget so we
 * never re-post after a crash. replyContext is whatever the platform needs
 * to target a reply — passed straight back into createComment.
 */
export interface PostResult {
  platformPostId: string;
  replyContext: unknown; // stored as JSON in PostJobTarget.replyContext
}

export interface CommentResult {
  platformCommentId: string;
}

/**
 * Every platform adapter must implement this interface.
 * The runner talks to adapters only through these four members.
 */
export interface PlatformAdapter {
  /** Lowercase platform identifier, matches Account.platform */
  name: string;

  /**
   * Called before every API call. Should check token expiry and refresh if
   * needed. Returns the (possibly updated) account record so the caller can
   * persist new tokens.
   */
  refreshTokenIfNeeded(account: Account): Promise<Account>;

  /**
   * Publish the post. Must be idempotent-safe: the runner persists
   * platformPostId immediately after this resolves, so on a crash-resume
   * this won't be called again for the same target.
   */
  createPost(
    account: Account,
    content: {
      text: string;
      mediaUrls: string[];
      altTexts?: string[];
      mediaType?: "post" | "reel" | "story";
      locationId?: string;           // Instagram: Facebook Place ID for location tagging
      userTags?: string[];           // Instagram: usernames to tag in the post
      collaborators?: string[];      // Instagram: usernames to add as collaborators
    }
  ): Promise<PostResult>;

  /**
   * Publish a reply to the post created by createPost.
   * replyContext is the exact value returned from createPost — cast it to
   * whatever shape your platform needs.
   */
  createComment(
    account: Account,
    replyContext: unknown,
    comment: string
  ): Promise<CommentResult>;
}
