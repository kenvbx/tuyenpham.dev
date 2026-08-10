import type { Session } from "@supabase/supabase-js";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { hasSupabaseConfig } from "../config/env";
import { ApiClientError, getCurrentUser, type CurrentUser } from "../lib/api";
import { supabase } from "../lib/supabase";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(
    supabase ? null : "Missing Supabase admin configuration.",
  );
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(supabase ? "loading" : "unauthenticated");
  const isConfigured = hasSupabaseConfig();

  const loadCurrentUser = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession?.access_token) {
      setCurrentUser(null);
      setStatus("unauthenticated");
      return;
    }

    try {
      const user = await getCurrentUser(nextSession.access_token);
      setCurrentUser(user);
      setError(null);
      setStatus("authenticated");
    } catch (loadError) {
      setCurrentUser(null);
      setError(formatAuthError(loadError));
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        void loadCurrentUser(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        void loadCurrentUser(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadCurrentUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        setError("Missing Supabase admin configuration.");
        throw new Error("Missing Supabase admin configuration.");
      }

      setStatus("loading");
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setCurrentUser(null);
        setSession(null);
        setStatus("unauthenticated");
        setError(signInError.message);
        throw signInError;
      }

      await loadCurrentUser(data.session);
    },
    [loadCurrentUser],
  );

  const refreshCurrentUser = useCallback(async () => {
    await loadCurrentUser(session);
  }, [loadCurrentUser, session]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setCurrentUser(null);
    setError(null);
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      error,
      hasPermission: (permission) =>
        Boolean(
          currentUser?.permissions.includes(permission) ||
          currentUser?.roles.some((role) => role.slug === "super-admin"),
        ),
      isConfigured,
      refreshCurrentUser,
      session,
      signIn,
      signOut,
      status,
      token: session?.access_token ?? null,
    }),
    [currentUser, error, isConfigured, refreshCurrentUser, session, signIn, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function formatAuthError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.payload.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to verify the current session.";
}
