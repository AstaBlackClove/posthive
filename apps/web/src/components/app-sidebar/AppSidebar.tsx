"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquareTextIcon, PlusIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { TrialBanner } from "@/components/TrialBanner";
import { Wordmark } from "@/components/Wordmark";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { apiFetch } from "@/lib/api";
import { canAccessPage } from "@/lib/permissions";
import { FeedbackDialog } from "./FeedbackDialog";
import { NewWorkspaceDialog } from "./NewWorkspaceDialog";
import { VerifyEmailNotice, WhatsNewCard } from "./SidebarNotices";
import { UserMenu } from "./UserMenu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { ADD_ACCOUNT, footerItemsFor, isActiveHref, manageGroupFor, navGroupsFor, type NavGroup, type NavItem } from "./nav-config";

/** A link, or a dimmed "Soon" row for a page that does not exist yet. */
function NavRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  if (item.href === null) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton aria-disabled="true" tooltip={`${item.label} (soon)`} className="cursor-not-allowed opacity-60">
          <Icon />
          <span>{item.label}</span>
        </SidebarMenuButton>
        <SidebarMenuBadge>Soon</SidebarMenuBadge>
      </SidebarMenuItem>
    );
  }
  const href = item.href;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActiveHref(pathname, href)} tooltip={item.label}>
        <Link href={href} aria-current={isActiveHref(pathname, href) ? "page" : undefined}>
          <Icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** One labelled group of links. Tight spacing: there are a lot of links and they should fit a laptop screen. */
function NavGroupBlock({ group, pathname }: { group: NavGroup; pathname: string }) {
  return (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel className="h-6">{group.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {group.items.map((item) => (
            <NavRow key={item.label} item={item} pathname={pathname} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * Closes the mobile drawer when the page CHANGES. It must not run on mount: it is rendered next to
 * the sidebar, and a run on the first render would close a drawer the person just opened.
 */
function CloseOnNavigate() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const last = useRef(pathname);
  useEffect(() => {
    if (last.current !== pathname) {
      last.current = pathname;
      setOpenMobile(false);
    }
  }, [pathname, setOpenMobile]);
  return null;
}

/**
 * The app's sidebar: workspace switcher, the links for the person's role, the notices
 * (email, trial, what's new), feedback and the user. Collapses to icons (button, rail or Ctrl+B);
 * on a phone it is a drawer.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const role = activeWorkspace?.role ?? user?.role;

  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    apiFetch<{ unread: number }>("/feedback/unread")
      .then((d) => setUnread(d.unread))
      .catch(() => {});
  }, []);

  async function handleSignOut() {
    await logout();
    router.replace("/login");
  }

  const groups = navGroupsFor(role);
  const manageGroup = manageGroupFor(role);
  const footerItems = footerItemsFor(role);
  const canAddAccount = canAccessPage(ADD_ACCOUNT.href, role);

  return (
    <>
      <CloseOnNavigate />
      <Sidebar collapsible="icon" variant="inset" aria-label="Main">
        <SidebarHeader>
          <div className="flex h-10 items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Link href="/dashboard" aria-label="Home" className="text-sidebar-primary group-data-[collapsible=icon]:hidden">
              <Wordmark size="md" />
            </Link>
            <SidebarTrigger aria-label="Toggle sidebar" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
          </div>
          <WorkspaceSwitcher onNewWorkspace={() => setNewWorkspaceOpen(true)} />
        </SidebarHeader>

        <SidebarContent className="gap-0">
          {groups.map((group) => (
            <NavGroupBlock key={group.label} group={group} pathname={pathname} />
          ))}

          {canAddAccount && (
            <SidebarGroup className="py-1">
              <SidebarGroupLabel className="h-6">Channel active</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={ADD_ACCOUNT.label} className="h-9 justify-center bg-neutral-600 text-white hover:bg-neutral-800 hover:text-white">
                      <Link href={ADD_ACCOUNT.href}>
                        <PlusIcon />
                        <span>{ADD_ACCOUNT.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {manageGroup && <NavGroupBlock group={manageGroup} pathname={pathname} />}

          {/* Scrolls with the links, so it never pushes them off the screen */}
          <div className="p-2 group-data-[collapsible=icon]:hidden">
            <WhatsNewCard />
          </div>
        </SidebarContent>

        <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          {user && !user.emailVerified && <VerifyEmailNotice />}
          <TrialBanner />
        </SidebarFooter>

        <SidebarFooter>
          <SidebarSeparator className="mx-0" />
          <SidebarMenu>
            {footerItems.map((item) => (
              <NavRow key={item.label} item={item} pathname={pathname} />
            ))}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Send feedback" onClick={() => setFeedbackOpen(true)}>
                <MessageSquareTextIcon />
                <span>Feedback</span>
              </SidebarMenuButton>
              {unread > 0 && (
                <SidebarMenuBadge className="rounded-full bg-red-500 text-white" aria-label={`${unread} unread answers`}>
                  {unread > 9 ? "9+" : unread}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator className="mx-0" />
          <UserMenu name={user?.name} email={user?.email} avatarUrl={user?.avatarUrl} onSignOut={() => void handleSignOut()} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} onUnreadChange={setUnread} />
      <NewWorkspaceDialog open={newWorkspaceOpen} onOpenChange={setNewWorkspaceOpen} />
    </>
  );
}

/** The mobile menu button that stays on screen while the drawer is closed. */
export function MobileMenuButton() {
  return (
    <div className="fixed top-3.5 left-3.5 z-40 md:hidden">
      <SidebarTrigger aria-label="Open menu" className="size-9 rounded-lg border border-border bg-surface text-fg" />
    </div>
  );
}
