// The post as the API's /jobs routes send it (the whole row, content JSON included). The dialogs for editing and
// reviewing a post take this shape; the Content List itself reads the lighter shapes of lib/content-list.ts.

export interface JobTarget {
  id: string;
  accountId: string;
  status: string;
  platformPostId: string | null;
  error: string | null;
  attempts: number;
  account: { platform: string; displayName: string; avatarUrl: string | null } | null;
}

export interface Job {
  id: string;
  userId?: string;
  scheduledFor: string | null;
  status: string;
  content: string;
  commentText: string | null;
  dryRun: boolean;
  createdAt: string;
  repeatInterval?: string | null;
  repeatParentId?: string | null;
  approvalStatus?: string | null; // pending | approved | rejected | null
  reviewNote?: string | null;
  reviewedBy?: { name: string } | null;
  reviewedAt?: string | null;
  targets: JobTarget[];
}
