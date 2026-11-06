"use client";

import { useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useToast } from "@/components/Toast";
import { useWorkspace, type Workspace } from "@/context/WorkspaceContext";

type Props = {
  onNewWorkspace: () => void;
};

const initialOf = (name: string | undefined, fallback: string) => name?.[0]?.toUpperCase() ?? fallback;

/** The active workspace at the top of the sidebar; click to switch or to create another. */
export function WorkspaceSwitcher({ onNewWorkspace }: Props) {
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace();
  const { error } = useToast();
  const { isMobile } = useSidebar();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (!activeWorkspace) return null;

  async function handleSwitch(ws: Workspace) {
    if (ws.id === activeWorkspace?.id) return;
    setSwitchingId(ws.id);
    try {
      await switchWorkspace(ws.id); // reloads the page on success
    } catch {
      error("Failed to switch workspace");
      setSwitchingId(null);
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" tooltip={activeWorkspace.name} className="data-[state=open]:bg-sidebar-accent">
              <span className="flex size-6.5 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary type-body-sb-xs text-sidebar-primary-foreground">
                {initialOf(activeWorkspace.name, "W")}
              </span>
              <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">{activeWorkspace.name}</span>
              <ChevronsUpDownIcon className="ml-auto group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56" side={isMobile ? "bottom" : "right"} align="start">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem key={ws.id} disabled={switchingId === ws.id} onSelect={() => void handleSwitch(ws)}>
                <span className="flex size-5.5 shrink-0 items-center justify-center rounded-lg bg-neutral-100 type-body-sb-xxs text-fg">
                  {initialOf(ws.name, "W")}
                </span>
                <span className="min-w-0 flex-1 truncate">{ws.name}</span>
                {ws.isActive && <CheckIcon className="text-brand-800" aria-label="Current workspace" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onNewWorkspace}>
              <span className="flex size-5.5 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-bg">
                <PlusIcon className="size-3" />
              </span>
              New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
