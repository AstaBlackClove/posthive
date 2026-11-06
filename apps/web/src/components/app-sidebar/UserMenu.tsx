"use client";

import { LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  onSignOut: () => void;
};

/** Who is signed in, and the way out. Shows only the avatar when the sidebar is collapsed. */
export function UserMenu({ name, email, avatarUrl, onSignOut }: Props) {
  const initial = name?.[0]?.toUpperCase() ?? "?";
  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-2 rounded-lg p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? ""} />}
          <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <p className="truncate type-body-sb-s">{name}</p>
          <p className="truncate type-body-r-xs text-sidebar-foreground/70">{email}</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Sign out" onClick={onSignOut} className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-red-300 group-data-[collapsible=icon]:hidden">
              <LogOutIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
