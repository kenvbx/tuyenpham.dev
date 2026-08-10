import { CmsIcon } from "@cms/ui";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { PermissionGate } from "../auth/PermissionGate";
import { useAuth } from "../auth/auth-context";
import { Breadcrumbs } from "../components/Breadcrumbs";
import {
  getNavigationItem,
  navigationItems,
  navigationSections,
} from "../navigation/navigation-registry";

export function AdminLayout() {
  const auth = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const title = getNavigationItem(location.pathname).title;

  return (
    <div className={isSidebarOpen ? "admin-shell is-sidebar-open" : "admin-shell"}>
      <button
        className="sidebar-scrim"
        type="button"
        aria-label="Close navigation"
        onClick={() => setIsSidebarOpen(false)}
      />
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
          {navigationSections.map((section) => (
            <div className="nav-section" key={section.id}>
              <p>{section.label}</p>
              {navigationItems
                .filter((item) => item.section === section.id)
                .map((item) => (
                  <PermissionGate key={item.label} permission={item.permission ?? ""}>
                    <NavLink
                      end={item.to === "/admin"}
                      to={item.to}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <CmsIcon name={item.icon} />
                      {item.label}
                    </NavLink>
                  </PermissionGate>
                ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="sidebar-toggle"
            type="button"
            aria-label="Open navigation"
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen((current) => !current)}
          >
            <CmsIcon name="menu" />
          </button>
          <div>
            <Breadcrumbs />
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
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
