// Role-based access control — single source of truth for the web app.
// Maps to docs/role-access-matrix.md: Admin = owner/admin, Marketing = member, Tim Desain = designer.

export type AppRole = "owner" | "admin" | "designer" | "member";

const REVIEW_ROLES: readonly AppRole[] = ["owner", "admin", "designer"];
const CONTENT_ROLES: readonly AppRole[] = ["owner", "admin", "member"];

function isAppRole(role: string | null | undefined): role is AppRole {
  return role === "owner" || role === "admin" || role === "designer" || role === "member";
}

// A missing or unknown role may do nothing that needs a role. This is the same as the API:
// isManageRole(null) and isContentEditorRole(null) are false there, and the server decides anyway.

/** Can make content: create, edit, duplicate, reschedule, delete, retry. (Matrix: Editor Konten, Planning Kalender) */
export function canEditContent(role: string | null | undefined): boolean {
  return isAppRole(role) && CONTENT_ROLES.includes(role);
}

/** Can approve/reject content in review. (Matrix: Review dan Approval) */
export function canReview(role: string | null | undefined): boolean {
  return isAppRole(role) && REVIEW_ROLES.includes(role);
}

/** Can upload, replace and delete templates — Tim Desain only. (Matrix: Pustaka Template, US-07) */
export function canManageTemplates(role: string | null | undefined): boolean {
  return role === "designer";
}

/** Admin in the matrix (owner or admin): team and invitations, accounts, groups, integrations, settings. */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Only the workspace owner: change roles, delete the workspace, cancel or change the plan. */
export function isOwnerRole(role: string | null | undefined): boolean {
  return role === "owner";
}

export interface Permissions {
  canEditContent: boolean;
  canReview: boolean;
  canManageTemplates: boolean;
  /**
   * The design-review flow applies to this person: the workspace requires approval and they
   * cannot approve. Their posts go "to review" instead of straight to the schedule.
   */
  canSubmitOwn: boolean;
}

/** What a role may do, computed once. The usePermissions hook wraps this with the current role. */
export function permissionsFor(
  role: string | null | undefined,
  { approvalRequired = false }: { approvalRequired?: boolean } = {}
): Permissions {
  return {
    canEditContent: canEditContent(role),
    canReview: canReview(role),
    canManageTemplates: canManageTemplates(role),
    canSubmitOwn: approvalRequired && !canReview(role),
  };
}

// Only for what a person may SEE (sidebar links, page guard): an unknown role gets the narrowest
// view, the same pages as a designer. It must not deny everything: RoleGuard sends a blocked
// person to /jobs, and a role that cannot open /jobs would redirect forever.
function normalizeRole(role: string | null | undefined): AppRole {
  return isAppRole(role) ? role : "designer";
}

// ── Route access map (used by RoleGuard) ────────────────────────────────────

const PAGE_ACCESS: Record<string, readonly AppRole[]> = {
  "/dashboard": ["owner", "admin", "designer", "member"],
  "/jobs": ["owner", "admin", "designer", "member"],
  "/templates": ["owner", "admin", "designer", "member"],
  "/compose": ["owner", "admin", "member"],
  "/jobs/import": ["owner", "admin", "member"],
  "/analytics": ["owner", "admin", "member"],
  "/library": ["owner", "admin"],
  "/accounts": ["owner", "admin"],
  "/groups": ["owner", "admin"],
  "/team": ["owner", "admin"],
  "/settings": ["owner", "admin"],
  "/integrations": ["owner", "admin"],
  "/billing": ["owner", "admin"],
};

/** Pages a role can open; unmatched routes fall through to allowed (own-profile pages etc). */
export function canAccessPage(pathname: string, role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  if (r === "owner" || r === "admin") return true;
  // Longest matching prefix wins, so "/jobs/import" isn't swallowed by "/jobs"
  const match = Object.keys(PAGE_ACCESS)
    .filter(prefix => pathname === prefix || pathname.startsWith(prefix + "/"))
    .sort((a, b) => b.length - a.length)[0];
  if (!match) return true;
  return PAGE_ACCESS[match].includes(r);
}
