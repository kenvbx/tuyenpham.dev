#!/usr/bin/env node

const adminUrl = trimTrailingSlash(process.env["STAGING_ADMIN_URL"]);
const apiUrl = trimTrailingSlash(process.env["STAGING_API_URL"]);

if (!adminUrl || !apiUrl) {
  console.error("STAGING_ADMIN_URL and STAGING_API_URL are required.");
  process.exit(1);
}

const checks = [
  {
    name: "API health",
    run: async () => {
      const response = await fetchJson(`${apiUrl}/health`);
      assert(response.status === "ok", "health status must be ok");
      assert(response.service === "cms-api", "health service must be cms-api");
    },
  },
  {
    name: "API robots",
    run: async () => {
      const response = await fetch(`${apiUrl}/robots.txt`);
      assert(response.ok, `robots returned ${response.status}`);
      assert(
        response.headers.get("content-type")?.includes("text/plain"),
        "robots must be text/plain",
      );
    },
  },
  {
    name: "API public settings",
    run: async () => {
      const response = await fetchJson(`${apiUrl}/public/settings`);
      assert("data" in response, "public settings must use API success envelope");
    },
  },
  {
    name: "Admin shell",
    run: async () => {
      const response = await fetch(adminUrl);
      const body = await response.text();
      assert(response.ok, `admin returned ${response.status}`);
      assert(body.includes('<div id="root"></div>'), "admin shell root is missing");
    },
  },
];

console.log("CMS staging smoke checks");

for (const check of checks) {
  await check.run();
  console.log(`- ${check.name}: passed`);
}

console.log("Staging smoke checks passed.");

async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);

  assert(response.ok, `${url} returned ${response.status}`);
  assert(body && typeof body === "object", `${url} must return JSON`);

  return body;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function trimTrailingSlash(value) {
  return value?.replace(/\/+$/u, "");
}
