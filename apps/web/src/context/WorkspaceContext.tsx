"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { apiFetch } from "../lib/api";

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  planStatus: string;
  trialEndsAt: string | null;
  memberCount: number;
  role: string; // owner | admin | member
  isActive: boolean;
  createdAt: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  refresh: () => void;
  switchWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspace: null,
  loading: true,
  refresh: () => {},
  switchWorkspace: async () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ workspaces: Workspace[] }>("/workspaces");
      setWorkspaces(data.workspaces ?? []);
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const activeWorkspace = workspaces.find((w) => w.isActive) ?? workspaces[0] ?? null;

  async function switchWorkspace(id: string) {
    await apiFetch(`/workspaces/switch/${id}`, { method: "PATCH" });
    // Hard reload — clears all workspace-scoped client state
    window.location.href = "/compose";
  }

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, loading, refresh: load, switchWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
