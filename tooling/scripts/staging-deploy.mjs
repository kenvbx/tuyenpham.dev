#!/usr/bin/env node

const hooks = [
  { name: "Render API", url: process.env["STAGING_RENDER_DEPLOY_HOOK_URL"] },
  { name: "Vercel Admin", url: process.env["STAGING_VERCEL_DEPLOY_HOOK_URL"] },
].filter((hook) => hook.url);

if (hooks.length === 0) {
  console.log("No staging deploy hooks configured. Skipping deploy trigger.");
  process.exit(0);
}

console.log("Triggering staging deploy hooks");

for (const hook of hooks) {
  const response = await fetch(hook.url, { method: "POST" });

  if (!response.ok) {
    throw new Error(`${hook.name} deploy hook returned ${response.status}`);
  }

  console.log(`- ${hook.name}: triggered`);
}

console.log("Deploy hooks triggered. Run staging smoke checks after provider deployments finish.");
