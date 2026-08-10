import type { ReactNode } from "react";

import { useAuth } from "./auth-context";

type PermissionGateProps = {
  children: ReactNode;
  fallback?: ReactNode;
  permission?: string;
};

export function PermissionGate({ children, fallback = null, permission }: PermissionGateProps) {
  const auth = useAuth();

  return !permission || auth.hasPermission(permission) ? children : fallback;
}
