import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./auth-context";

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return (
      <main className="route-loading" aria-live="polite">
        Loading session
      </main>
    );
  }

  if (auth.status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
