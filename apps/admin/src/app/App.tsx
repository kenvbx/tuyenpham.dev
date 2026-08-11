import { Permission } from "@cms/shared";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";
import { PermissionGate } from "./auth/PermissionGate";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ToastProvider } from "./components/ToastProvider";
import { AdminLayout } from "./layouts/AdminLayout";
import { BlogPage } from "./pages/BlogPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MediaPage } from "./pages/MediaPage";
import { MenusPage } from "./pages/MenusPage";
import { PagesPage } from "./pages/PagesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RolesPage } from "./pages/RolesPage";
import { UsersPage } from "./pages/UsersPage";

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route
                path="blog"
                element={
                  <PermissionGate fallback={<DashboardPage />} permission={Permission.BLOG_INDEX}>
                    <BlogPage />
                  </PermissionGate>
                }
              />
              <Route
                path="media"
                element={
                  <PermissionGate fallback={<DashboardPage />} permission={Permission.MEDIA_INDEX}>
                    <MediaPage />
                  </PermissionGate>
                }
              />
              <Route
                path="menus"
                element={
                  <PermissionGate fallback={<DashboardPage />} permission={Permission.MENUS_INDEX}>
                    <MenusPage />
                  </PermissionGate>
                }
              />
              <Route
                path="pages"
                element={
                  <PermissionGate fallback={<DashboardPage />} permission={Permission.PAGES_INDEX}>
                    <PagesPage />
                  </PermissionGate>
                }
              />
              <Route
                path="roles"
                element={
                  <PermissionGate fallback={<DashboardPage />} permission={Permission.ROLES_INDEX}>
                    <RolesPage />
                  </PermissionGate>
                }
              />
              <Route
                path="users"
                element={
                  <PermissionGate fallback={<DashboardPage />} permission={Permission.USERS_INDEX}>
                    <UsersPage />
                  </PermissionGate>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
