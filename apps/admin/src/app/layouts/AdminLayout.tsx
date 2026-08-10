import { CmsIcon, type CmsIconName } from "@cms/ui";
import { Outlet } from "react-router-dom";

type NavigationItem = {
  icon: CmsIconName;
  label: string;
};

const navigationItems: NavigationItem[] = [
  { icon: "dashboard", label: "Dashboard" },
  { icon: "fileText", label: "Pages" },
  { icon: "article", label: "Blog" },
  { icon: "media", label: "Media" },
  { icon: "menu", label: "Menus" },
  { icon: "settings", label: "Settings" },
  { icon: "users", label: "System" },
];

export function AdminLayout() {
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
            <a
              key={item.label}
              href="/admin"
              aria-current={item.label === "Dashboard" ? "page" : undefined}
            >
              <CmsIcon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p>Admin</p>
            <h1>Dashboard</h1>
          </div>
          <a className="topbar-link" href="/login">
            <CmsIcon name="login" />
            Login
          </a>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
