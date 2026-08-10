import type { User } from "@supabase/supabase-js";

export type AuthenticatedUser = {
  appMetadata: User["app_metadata"];
  aud: string;
  email: string | null;
  id: string;
  role: string | null;
  userMetadata: User["user_metadata"];
};

export type AuthTokenResult = {
  token: string;
};
