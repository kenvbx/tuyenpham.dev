import { Permission } from "@cms/shared";
import { CmsIcon, type CmsIconName } from "@cms/ui";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";

type NavigationItem = {
  icon: CmsIconName;
  label: string;
  permission?: string;
  to: string;
};

const navigationItems: NavigationItem[] = [
  { icon: "dashboard", label: "Dashboard", to: "/admin" },
  { icon: "fileText", label: "Pages", permission: Permission.PAGES_INDEX, to: "/admin/pages" },
  { icon: "article", label: "Blog", permission: Permission.BLOG_INDEX, to: "/admin/blog" },
  { icon: "media", label: "Media", permission: Permission.MEDIA_INDEX, to: "/admin/media" },
  { icon: "menu", label: "Menus", permission: Permission.MENUS_INDEX, to: "/admin/menus" },
  { icon: "users", label: "Users", permission: Permission.USERS_INDEX, to: "/admin/users" },
  { icon: "shield", label: "Roles", permission: Permission.ROLES_INDEX, to: "/admin/roles" },
  {
    icon: "settings",
    label: "Settings",
    permission: Permission.SETTINGS_INDEX,
    to: "/admin/settings",
  },
];

export function AdminLayout() {
  const auth = useAuth();
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="brand">
          <span className="brand-mark">
            <CmsIcon name="brand" size={24} stroke={1.6} />
          </span>
          <span>
            <strong>Tuyen Pham</strong>
            <small>CMS</small>
          </span>
        </div>
        <nav>
          {navigationItems.map((item) => (
            <PermissionGate key={item.label} permission={item.permission ?? ""}>
              <NavLink end={item.to === "/admin"} to={item.to}>
                <CmsIcon name={item.icon} />
                {item.label}
              </NavLink>
            </PermissionGate>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p>Admin</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-user">
            <span>
              <strong>
                {auth.currentUser?.profile.displayName ?? auth.currentUser?.profile.email}
              </strong>
              <small>
                {auth.currentUser?.roles.map((role) => role.name).join(", ") || "No role"}
              </small>
            </span>
            <button className="topbar-link" type="button" onClick={() => void auth.signOut()}>
              <CmsIcon name="logout" />
              Logout
            </button>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/admin/users")) {
    return "Users";
  }

  if (pathname.startsWith("/admin/roles")) {
    return "Roles";
  }

  return "Dashboard";
}
