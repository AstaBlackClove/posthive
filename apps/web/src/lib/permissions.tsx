"use client";

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

// ── Sidebar navigation per role ─────────────────────────────────────────────

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ICONS: Record<string, React.ReactNode> = {
  posts: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  importPlan: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>,
  templates: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="13" height="16" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7v12a2 2 0 01-2 2H8M7 8h5M7 12h5" /></svg>,
  library: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  analytics: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  accounts: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  groups: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></svg>,
  team: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  settings: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  integrations: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
  billing: <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Posts",
    items: [
      { href: "/jobs", label: "Posts", icon: ICONS.posts },
      { href: "/templates", label: "Templates", icon: ICONS.templates },
      { href: "/jobs/import", label: "Import Plan", icon: ICONS.importPlan },
      { href: "/library", label: "Library", icon: ICONS.library },
      { href: "/analytics", label: "Analytics", icon: ICONS.analytics },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/accounts", label: "Accounts", icon: ICONS.accounts },
      { href: "/groups", label: "Groups", icon: ICONS.groups },
      { href: "/team", label: "Team", icon: ICONS.team },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/settings", label: "Settings", icon: ICONS.settings },
      { href: "/integrations", label: "Integrations", icon: ICONS.integrations },
      { href: "/billing", label: "Billing", icon: ICONS.billing },
    ],
  },
];

export function navByRole(role: string | null | undefined): NavGroup[] {
  const r = normalizeRole(role);
  return NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => canAccessPage(item.href, r)),
    }))
    .filter(group => group.items.length > 0);
}

// ── Route access map (used by RoleGuard) ────────────────────────────────────

const PAGE_ACCESS: Record<string, readonly AppRole[]> = {
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
