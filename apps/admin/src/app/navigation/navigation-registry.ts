import { Permission } from "@cms/shared";
import type { CmsIconName } from "@cms/ui";

export type NavigationItem = {
  icon: CmsIconName;
  label: string;
  permission?: string;
  section: "content" | "system" | "workspace";
  title: string;
  to: string;
};

const dashboardNavigationItem: NavigationItem = {
  icon: "dashboard",
  label: "Dashboard",
  section: "workspace",
  title: "Dashboard",
  to: "/admin",
};

export const navigationItems: NavigationItem[] = [
  dashboardNavigationItem,
  {
    icon: "users",
    label: "Profile",
    section: "workspace",
    title: "Profile",
    to: "/admin/profile",
  },
  {
    icon: "fileText",
    label: "Pages",
    permission: Permission.PAGES_INDEX,
    section: "content",
    title: "Pages",
    to: "/admin/pages",
  },
  {
    icon: "article",
    label: "Blog",
    permission: Permission.BLOG_INDEX,
    section: "content",
    title: "Blog",
    to: "/admin/blog",
  },
  {
    icon: "media",
    label: "Media",
    permission: Permission.MEDIA_INDEX,
    section: "content",
    title: "Media",
    to: "/admin/media",
  },
  {
    icon: "menu",
    label: "Menus",
    permission: Permission.MENUS_INDEX,
    section: "content",
    title: "Menus",
    to: "/admin/menus",
  },
  {
    icon: "users",
    label: "Users",
    permission: Permission.USERS_INDEX,
    section: "system",
    title: "Users",
    to: "/admin/users",
  },
  {
    icon: "shield",
    label: "Roles",
    permission: Permission.ROLES_INDEX,
    section: "system",
    title: "Roles",
    to: "/admin/roles",
  },
  {
    icon: "settings",
    label: "Settings",
    permission: Permission.SETTINGS_INDEX,
    section: "system",
    title: "Settings",
    to: "/admin/settings",
  },
];

export const navigationSections = [
  { id: "workspace", label: "Workspace" },
  { id: "content", label: "Content" },
  { id: "system", label: "System" },
] as const;

export function getNavigationItem(pathname: string) {
  return (
    [...navigationItems]
      .sort((left, right) => right.to.length - left.to.length)
      .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) ??
    dashboardNavigationItem
  );
}
