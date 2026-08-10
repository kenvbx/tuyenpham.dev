import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { type AppEnv, appEnv } from "../config/env.js";

type SupabaseEnv = Pick<AppEnv, "SUPABASE_SERVICE_ROLE_KEY" | "SUPABASE_URL">;

export function createServerSupabaseClient(env: SupabaseEnv = appEnv): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export const supabase = createServerSupabaseClient();
