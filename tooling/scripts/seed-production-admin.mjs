#!/usr/bin/env node

const isDryRun = process.argv.includes("--dry-run");
const requiredEnv = isDryRun
  ? ["PROD_ADMIN_EMAIL"]
  : ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PROD_ADMIN_EMAIL"];
const missing = requiredEnv.filter((name) => !process.env[name]);
const password = process.env["PROD_ADMIN_PASSWORD"];

if (!isDryRun && !password) {
  missing.push("PROD_ADMIN_PASSWORD");
}

if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

const email = process.env["PROD_ADMIN_EMAIL"] ?? "admin@example.com";

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
  console.error("PROD_ADMIN_EMAIL must be a valid email address.");
  process.exit(1);
}

if (password && password.length < 12) {
  console.error("PROD_ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

if (isDryRun) {
  console.log(`Dry run complete. Production admin payload is valid for ${email}.`);
  process.exit(0);
}

const supabaseUrl = process.env["SUPABASE_URL"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  body: JSON.stringify({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      display_name: "Production Admin",
    },
  }),
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  },
  method: "POST",
});

const body = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error("Unable to create production admin user.", body);
  process.exit(1);
}

console.log(`Production admin user is ready: ${email}`);
