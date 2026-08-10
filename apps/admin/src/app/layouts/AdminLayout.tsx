import { Outlet } from "react-router-dom";

const navigationItems = [
  "Dashboard",
  "Pages",
  "Blog",
  "Media",
  "Menus",
  "Settings",
  "System",
];

export function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="brand">
          <span className="brand-mark">TP</span>
          <span>
            <strong>Tuyen Pham</strong>
            <small>CMS</small>
          </span>
        </div>
        <nav>
          {navigationItems.map((item) => (
            <a key={item} href="/admin" aria-current={item === "Dashboard" ? "page" : undefined}>
              {item}
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

