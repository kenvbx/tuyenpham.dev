#!/usr/bin/env node

import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const ADMIN_DIST = path.join(ROOT, "apps/admin/dist");
const MAX_ADMIN_ASSET_BYTES = 750 * 1024;
const MAX_ADMIN_TOTAL_BYTES = 2 * 1024 * 1024;

async function main() {
  const files = await listFiles(ADMIN_DIST);
  const assets = await Promise.all(
    files
      .filter((file) => /\.(css|js)$/u.test(file))
      .map(async (file) => ({ file, size: (await stat(file)).size })),
  );
  const totalBytes = assets.reduce((sum, asset) => sum + asset.size, 0);
  const oversizedAsset = assets.find((asset) => asset.size > MAX_ADMIN_ASSET_BYTES);

  console.log(`Admin JS/CSS total: ${formatBytes(totalBytes)}`);

  if (oversizedAsset) {
    throw new Error(
      `Performance budget exceeded: ${path.relative(ROOT, oversizedAsset.file)} is ${formatBytes(
        oversizedAsset.size,
      )}, max ${formatBytes(MAX_ADMIN_ASSET_BYTES)}.`,
    );
  }

  if (totalBytes > MAX_ADMIN_TOTAL_BYTES) {
    throw new Error(
      `Performance budget exceeded: admin assets total ${formatBytes(totalBytes)}, max ${formatBytes(
        MAX_ADMIN_TOTAL_BYTES,
      )}.`,
    );
  }

  console.log("Performance budget passed.");
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const location = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(location) : [location];
    }),
  );

  return files.flat();
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
