import {
  ChartColumn,
  CircleHelp,
  CreditCard,
  Download,
  Image as ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  Library,
  Link2,
  List,
  ListChecks,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { canAccessPage } from "@/lib/permissions";

// The sidebar's links, as data (no JSX). Role filtering uses the same page map as RoleGuard, so
// the sidebar never links to a page the guard would bounce the person from.

export interface NavItem {
  label: string;
  /** null = the page does not exist yet: shown dimmed with "Soon", not a link. */
  href: string | null;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** The middle of the sidebar: grouped links. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutGrid }],
  },
  {
    label: "Content workspace",
    items: [
      { label: "Import quarter plan", href: "/jobs/import", icon: Download },
      { label: "Content list", href: "/jobs", icon: List },
      { label: "My task", href: null, icon: ListChecks },
      { label: "Analytics", href: "/analytics", icon: ChartColumn },
    ],
  },
  {
    label: "Assets",
    items: [
      { label: "Templates", href: "/templates", icon: LayoutTemplate },
      { label: "Media library", href: null, icon: ImageIcon },
      { label: "Library", href: "/library", icon: Library },
    ],
  },
  {
    label: "Channel",
    items: [
      { label: "Platform", href: "/integrations", icon: Link2 },
      { label: "Groups", href: "/groups", icon: UsersRound },
    ],
  },
];

/** Team and billing: after "Add account", for the roles that may open them. */
export const MANAGE_GROUP: NavGroup = {
  label: "Workspace",
  items: [
    { label: "Team", href: "/team", icon: Users },
    { label: "Billing", href: "/billing", icon: CreditCard },
  ],
};

/** The bottom of the sidebar, above the user row. Kept short so the links above stay on screen. */
export const FOOTER_ITEMS: NavItem[] = [
  { label: "Help & support", href: null, icon: CircleHelp },
  { label: "Setting & integration", href: "/settings", icon: Settings },
];

/** "Add account" button of the Channel active group. */
export const ADD_ACCOUNT = { label: "Add account", href: "/accounts" } as const;

const visible = (item: NavItem, role: string | null | undefined) => item.href === null || canAccessPage(item.href, role);

/** The links a role may see. A group with nothing left is dropped. */
export function navGroupsFor(role: string | null | undefined): NavGroup[] {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => visible(i, role)) })).filter((g) => g.items.length > 0);
}

/** The workspace group (team, billing), or null when the role may open neither. */
export function manageGroupFor(role: string | null | undefined): NavGroup | null {
  const items = MANAGE_GROUP.items.filter((i) => visible(i, role));
  return items.length > 0 ? { ...MANAGE_GROUP, items } : null;
}

export function footerItemsFor(role: string | null | undefined): NavItem[] {
  return FOOTER_ITEMS.filter((i) => visible(i, role));
}

const ALL_HREFS = [...NAV_GROUPS.flatMap((g) => g.items), ...MANAGE_GROUP.items, ...FOOTER_ITEMS, ADD_ACCOUNT]
  .map((i) => i.href)
  .filter((h): h is string => h !== null);

/**
 * Which link is "you are here". An exact match wins; otherwise the longest link the path sits
 * under, so /jobs/import lights up "Import quarter plan" and not also "Content list" (/jobs),
 * while /jobs/123 still lights up "Content list".
 */
export function isActiveHref(pathname: string, href: string | null, hrefs: readonly string[] = ALL_HREFS): boolean {
  if (href === null) return false;
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  return !hrefs.some((other) => other !== href && other.length > href.length && (pathname === other || pathname.startsWith(other + "/")));
}
