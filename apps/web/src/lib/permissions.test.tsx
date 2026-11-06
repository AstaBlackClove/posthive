// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import {
  canAccessPage,
  canEditContent,
  canManageTemplates,
  canReview,
  isAdminRole,
  isOwnerRole,
  navByRole,
  permissionsFor,
} from "./permissions";

// The matrix in docs/role-access-matrix.md: Admin = owner + admin, Marketing = member, Tim Desain = designer.
const ROLES = ["owner", "admin", "designer", "member"] as const;

afterEach(cleanup);

describe("role predicates (docs/role-access-matrix.md)", () => {
  it("who can make content: owner, admin and member, not the design team", () => {
    expect(ROLES.filter(canEditContent)).toEqual(["owner", "admin", "member"]);
  });

  it("who can approve or reject: owner, admin and the design team, not marketing", () => {
    expect(ROLES.filter(canReview)).toEqual(["owner", "admin", "designer"]);
  });

  it("who manages templates: the design team only", () => {
    expect(ROLES.filter(canManageTemplates)).toEqual(["designer"]);
  });

  it("isAdminRole is owner and admin; isOwnerRole is the owner alone", () => {
    expect(ROLES.filter(isAdminRole)).toEqual(["owner", "admin"]);
    expect(ROLES.filter(isOwnerRole)).toEqual(["owner"]);
  });

  it("no role at all is not an admin and not an owner", () => {
    for (const none of [undefined, null, ""]) {
      expect(isAdminRole(none)).toBe(false);
      expect(isOwnerRole(none)).toBe(false);
    }
  });

  // The API treats a missing membership as "no rights" (isManageRole / isContentEditorRole), so the
  // web must not show Approve, Reject or template buttons to a role it does not know.
  it("a missing or unknown role may do nothing", () => {
    for (const odd of [undefined, null, "", "superuser", "Owner"]) {
      expect(canReview(odd), String(odd)).toBe(false);
      expect(canEditContent(odd), String(odd)).toBe(false);
      expect(canManageTemplates(odd), String(odd)).toBe(false);
    }
  });
});

describe("page access", () => {
  const open = (path: string) => ROLES.filter((r) => canAccessPage(path, r));

  it("accounts, groups, team, settings, integrations, billing and library are for owner and admin", () => {
    for (const p of ["/accounts", "/groups", "/team", "/settings", "/integrations", "/billing", "/library"]) {
      expect(open(p), p).toEqual(["owner", "admin"]);
    }
  });

  it("compose and import are for whoever makes content, not the design team", () => {
    expect(open("/compose")).toEqual(["owner", "admin", "member"]);
    expect(open("/jobs/import")).toEqual(["owner", "admin", "member"]);
    expect(open("/analytics")).toEqual(["owner", "admin", "member"]);
  });

  it("the calendar and the template library open for everyone", () => {
    expect(open("/jobs")).toEqual([...ROLES]);
    expect(open("/templates")).toEqual([...ROLES]);
  });

  it("/jobs/import is not swallowed by /jobs (the longest prefix wins)", () => {
    expect(canAccessPage("/jobs/import", "designer")).toBe(false);
    expect(canAccessPage("/jobs", "designer")).toBe(true);
  });

  it("a sub-path follows its parent, and a page that is not listed is open", () => {
    expect(canAccessPage("/accounts/anything", "member")).toBe(false);
    expect(canAccessPage("/profile", "designer")).toBe(true);
  });

  it("a path that only starts with a prefix is not that page", () => {
    expect(canAccessPage("/accounts-old", "member")).toBe(true);
  });

  // RoleGuard redirects a blocked person to /jobs. If an unknown role could not open /jobs it would
  // be redirected from /jobs to /jobs forever, so the page guard gives it the narrowest view instead.
  it("an unknown role can open /jobs and /templates and nothing that needs a role", () => {
    for (const odd of [undefined, null, "superuser"]) {
      expect(canAccessPage("/jobs", odd)).toBe(true);
      expect(canAccessPage("/templates", odd)).toBe(true);
      expect(canAccessPage("/compose", odd)).toBe(false);
      expect(canAccessPage("/billing", odd)).toBe(false);
    }
  });
});

describe("navByRole", () => {
  const hrefs = (role: string) => navByRole(role).flatMap((g) => g.items.map((i) => i.href));

  // /compose is not in the sidebar: it opens from the "New post" button, shown when canEditContent.
  it("owner and admin see every page, member and designer see fewer", () => {
    for (const r of ["owner", "admin"]) {
      expect(hrefs(r)).toEqual(expect.arrayContaining(["/jobs", "/templates", "/jobs/import", "/library", "/analytics", "/accounts", "/groups", "/team", "/settings", "/integrations", "/billing"]));
    }
    expect(hrefs("member").length).toBeLessThan(hrefs("owner").length);
    expect(hrefs("designer").length).toBeLessThan(hrefs("member").length);
  });

  it("a member never gets a link to a page the guard would bounce them from", () => {
    for (const r of ROLES) for (const href of hrefs(r)) expect(canAccessPage(href, r), `${r} ${href}`).toBe(true);
  });

  it("a designer sees the posts and templates only; a member also gets import and analytics but no manage pages", () => {
    expect(hrefs("designer")).toEqual(["/jobs", "/templates"]);
    expect(hrefs("member")).toEqual(["/jobs", "/templates", "/jobs/import", "/analytics"]);
    for (const p of ["/accounts", "/groups", "/team", "/settings", "/integrations", "/billing", "/library"]) {
      expect(hrefs("member"), p).not.toContain(p);
    }
  });

  it("drops a group that ends up empty", () => {
    for (const r of ROLES) for (const g of navByRole(r)) expect(g.items.length).toBeGreaterThan(0);
  });
});

describe("permissionsFor", () => {
  it("gives all of it for each role", () => {
    expect(permissionsFor("owner")).toEqual({ canEditContent: true, canReview: true, canManageTemplates: false, canSubmitOwn: false });
    expect(permissionsFor("admin")).toEqual({ canEditContent: true, canReview: true, canManageTemplates: false, canSubmitOwn: false });
    expect(permissionsFor("designer")).toEqual({ canEditContent: false, canReview: true, canManageTemplates: true, canSubmitOwn: false });
    expect(permissionsFor("member")).toEqual({ canEditContent: true, canReview: false, canManageTemplates: false, canSubmitOwn: false });
  });

  it("canSubmitOwn: only when the workspace needs approval AND the person cannot approve", () => {
    const flag = (role: string | undefined, approvalRequired?: boolean) => permissionsFor(role, { approvalRequired }).canSubmitOwn;
    expect(flag("member", true)).toBe(true);
    expect(flag("member", false)).toBe(false);
    expect(flag("member")).toBe(false);
    for (const r of ["owner", "admin", "designer"]) expect(flag(r, true), r).toBe(false);
  });

  // compose used to decide this as: approvalRequired && !["owner","admin","designer"].includes(role ?? "")
  it("an unknown role goes through review when the workspace needs it, like compose always did", () => {
    expect(permissionsFor(undefined, { approvalRequired: true }).canSubmitOwn).toBe(true);
    expect(permissionsFor("superuser", { approvalRequired: true }).canSubmitOwn).toBe(true);
    expect(permissionsFor(undefined, { approvalRequired: false }).canSubmitOwn).toBe(false);
  });
});

// ── the hook ────────────────────────────────────────────────────────────────

const auth = vi.hoisted(() => ({ user: null as { role?: string } | null }));
const ws = vi.hoisted(() => ({
  activeWorkspace: null as { role: string; approvalRequired?: boolean } | null,
  loading: false,
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock("../context/WorkspaceContext", () => ({ useWorkspace: () => ws }));

import { usePermissions } from "./usePermissions";

function as(role: string | null, opts: { approvalRequired?: boolean; sessionRole?: string; loading?: boolean } = {}) {
  ws.activeWorkspace = role ? { role, approvalRequired: opts.approvalRequired } : null;
  auth.user = opts.sessionRole ? { role: opts.sessionRole } : null;
  ws.loading = opts.loading ?? false;
  return renderHook(() => usePermissions()).result.current;
}

describe("usePermissions", () => {
  it("reads the workspace role", () => {
    expect(as("designer")).toMatchObject({ canReview: true, canEditContent: false, canManageTemplates: true });
  });

  it("falls back to the session role when there is no workspace yet", () => {
    const p = as(null, { sessionRole: "admin" });
    expect(p).toMatchObject({ canReview: true, canEditContent: true });
    expect(p.canAccess("/billing")).toBe(true);
  });

  it("the workspace role wins over the session role", () => {
    const p = as("member", { sessionRole: "owner" });
    expect(p).toMatchObject({ canReview: false, canEditContent: true });
    expect(p.canAccess("/billing")).toBe(false);
  });

  it("passes the workspace's approvalRequired through to canSubmitOwn", () => {
    expect(as("member", { approvalRequired: true }).canSubmitOwn).toBe(true);
    expect(as("member", { approvalRequired: false }).canSubmitOwn).toBe(false);
    expect(as("admin", { approvalRequired: true }).canSubmitOwn).toBe(false);
  });

  it("reports loading, so a page can wait before deciding", () => {
    expect(as("owner", { loading: true }).loading).toBe(true);
    expect(as("owner").loading).toBe(false);
  });

  it("with no role anywhere: may do nothing, and can only open the narrowest pages", () => {
    const p = as(null);
    expect(p).toMatchObject({ canReview: false, canEditContent: false, canManageTemplates: false });
    expect(p.canAccess("/jobs")).toBe(true);
    expect(p.canAccess("/billing")).toBe(false);
  });

  it("gives the nav and the page check for its role", () => {
    const member = as("member");
    expect(member.navGroups.flatMap((g) => g.items.map((i) => i.href))).toContain("/jobs/import");
    expect(member.canAccess("/billing")).toBe(false);
    expect(member.canAccess("/compose")).toBe(true);
    expect(as("owner").canAccess("/billing")).toBe(true);
  });
});
