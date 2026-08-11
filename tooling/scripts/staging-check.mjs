#!/usr/bin/env node

const REQUIRED_SECRETS = [
  "STAGING_ADMIN_URL",
  "STAGING_API_URL",
  "STAGING_DATABASE_URL",
  "STAGING_SUPABASE_URL",
  "STAGING_SUPABASE_ANON_KEY",
  "STAGING_SUPABASE_SERVICE_ROLE_KEY",
];
const OPTIONAL_SECRETS = [
  "STAGING_ERROR_MONITORING_DSN",
  "STAGING_RENDER_DEPLOY_HOOK_URL",
  "STAGING_VERCEL_DEPLOY_HOOK_URL",
];

const missing = REQUIRED_SECRETS.filter((name) => !process.env[name]);

console.log("CMS staging configuration check");

for (const name of REQUIRED_SECRETS) {
  console.log(`- ${name}: ${process.env[name] ? "configured" : "missing"}`);
}

for (const name of OPTIONAL_SECRETS) {
  console.log(`- ${name}: ${process.env[name] ? "configured" : "optional"}`);
}

if (missing.length > 0) {
  console.error(`Missing staging secret(s): ${missing.join(", ")}`);
  process.exit(1);
}

assertUrl("STAGING_ADMIN_URL");
assertUrl("STAGING_API_URL");
assertUrl("STAGING_SUPABASE_URL");
assertUrl("STAGING_DATABASE_URL", { protocols: ["postgresql:", "postgres:"] });

console.log("Staging configuration is ready.");

function assertUrl(name, options = {}) {
  const protocols = options.protocols ?? ["https:", "http:"];
  const value = process.env[name];

  try {
    const url = new URL(value);

    if (!protocols.includes(url.protocol)) {
      throw new Error(`${name} must use one of: ${protocols.join(", ")}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : `${name} must be a valid URL.`);
    process.exit(1);
  }
}
