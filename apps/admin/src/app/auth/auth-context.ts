import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

import type { CurrentUser } from "../lib/api";

export type AuthStatus = "authenticated" | "loading" | "unauthenticated";

export type AuthContextValue = {
  currentUser: CurrentUser | null;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  isConfigured: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  status: AuthStatus;
  token: string | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
