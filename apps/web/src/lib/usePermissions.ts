"use client";

import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { canAccessPage, permissionsFor, type Permissions } from "./permissions";

export interface UsePermissions extends Permissions {
  /** The workspace list is still loading, so the role is not final. */
  loading: boolean;
  canAccess: (pathname: string) => boolean;
}

/**
 * What the signed-in person may do in the active workspace. The role is the workspace's role,
 * falling back to the one on the session. Pages that must read the session role only (billing,
 * accounts, settings) or the workspace role only (team, compose) keep their own source and use
 * the predicates in lib/permissions instead.
 */
export function usePermissions(): UsePermissions {
  const { user } = useAuth();
  const { activeWorkspace, loading } = useWorkspace();
  const role = activeWorkspace?.role ?? user?.role;
  return {
    ...permissionsFor(role, { approvalRequired: activeWorkspace?.approvalRequired }),
    loading,
    canAccess: (pathname) => canAccessPage(pathname, role),
  };
}
