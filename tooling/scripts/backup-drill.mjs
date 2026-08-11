#!/usr/bin/env node

const REQUIRED_TABLES = [
  "profiles",
  "roles",
  "permissions",
  "role_permissions",
  "user_roles",
  "settings",
  "slugs",
  "seo_meta",
  "media_folders",
  "media_files",
  "pages",
  "posts",
  "categories",
  "tags",
  "menus",
  "menu_nodes",
  "audit_logs",
  "revisions",
];

const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const isDryRun = process.argv.includes("--dry-run");

console.log("CMS backup/restore drill");

for (const table of REQUIRED_TABLES) {
  console.log(`- verify export/import coverage for public.${table}`);
}

if (isDryRun) {
  console.log("Dry run complete. No remote backup or restore actions were executed.");
  process.exit(0);
}

const missing = REQUIRED_ENV.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Environment is ready for a staging backup/restore drill.");
