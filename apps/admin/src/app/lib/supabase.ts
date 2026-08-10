import { createClient } from "@supabase/supabase-js";

import { adminEnv, hasSupabaseConfig } from "../config/env";

export const supabase = hasSupabaseConfig()
  ? createClient(adminEnv.supabaseUrl, adminEnv.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;
