export const adminEnv = {
  apiUrl: import.meta.env["VITE_API_URL"] || "http://localhost:4000",
  supabaseAnonKey: import.meta.env["VITE_SUPABASE_ANON_KEY"] || "",
  supabaseUrl: import.meta.env["VITE_SUPABASE_URL"] || "",
};

export function hasSupabaseConfig() {
  return Boolean(adminEnv.supabaseUrl && adminEnv.supabaseAnonKey);
}
