import { Permission } from "@cms/shared";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";
import { PermissionGate } from "./auth/PermissionGate";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ToastProvider } from "./components/ToastProvider";
import { AdminLayout } from "./layouts/AdminLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MediaPage } from "./pages/MediaPage";
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
                path="media"
                element={
                  <PermissionGate fallback={<DashboardPage />} permission={Permission.MEDIA_INDEX}>
                    <MediaPage />
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
