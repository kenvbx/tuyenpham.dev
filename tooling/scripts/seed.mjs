import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";
import pg from "pg";

const { Client } = pg;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_SEEDS_DIR = path.join(REPO_ROOT, "supabase/seeds");

for (const envPath of [path.join(REPO_ROOT, ".env"), path.join(REPO_ROOT, "apps/api/.env")]) {
  loadDotenv({ path: envPath, quiet: true });
}

function parseArgs(argv) {
  const options = {
    databaseUrl: process.env.DATABASE_URL,
    dryRun: false,
    help: false,
    seedsDir: DEFAULT_SEEDS_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--":
        break;
      case "--database-url":
        options.databaseUrl = readFlagValue(argv, index, arg);
        index += 1;
        break;
      case "--dir":
        options.seedsDir = path.resolve(REPO_ROOT, readFlagValue(argv, index, arg));
        index += 1;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function readFlagValue(argv, index, flag) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

function printHelp() {
  console.log(`Usage: pnpm db:seed -- [options]

Options:
  --dry-run              List seed files without connecting to the database
  --database-url <url>   Override DATABASE_URL
  --dir <path>           Seed directory, relative to repo root by default
  --help                 Show this help
`);
}

function resolveSsl(databaseUrl) {
  const override = process.env.DATABASE_SSL?.toLowerCase();

  if (override === "false" || override === "disable") {
    return false;
  }

  if (override === "true" || override === "require") {
    return { rejectUnauthorized: false };
  }

  try {
    const hostname = new URL(databaseUrl).hostname;
    return hostname.endsWith(".supabase.co") || hostname.includes("supabase")
      ? { rejectUnauthorized: false }
      : false;
  } catch {
    return false;
  }
}

async function loadSeeds(seedsDir) {
  if (!existsSync(seedsDir)) {
    throw new Error(`Seed directory does not exist: ${seedsDir}`);
  }

  const entries = await readdir(seedsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const seeds = [];

  for (const file of files) {
    const absolutePath = path.join(seedsDir, file);
    const sql = await readFile(absolutePath, "utf8");

    seeds.push({
      name: file,
      path: absolutePath,
      sql,
    });
  }

  return seeds;
}

function printSeedPlan({ seeds, seedsDir }) {
  console.log(`Seed directory: ${path.relative(REPO_ROOT, seedsDir) || "."}`);

  if (seeds.length === 0) {
    console.log("No SQL seed files found.");
    return;
  }

  console.log(`Found ${seeds.length} seed file(s):`);

  for (const seed of seeds) {
    console.log(`- ${seed.name}`);
  }
}

async function applySeeds({ databaseUrl, seeds }) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required unless --dry-run is used");
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: resolveSsl(databaseUrl),
  });

  await client.connect();

  try {
    for (const seed of seeds) {
      console.log(`Applying ${seed.name}`);
      await client.query("begin");

      try {
        if (seed.sql.trim()) {
          await client.query(seed.sql);
        }

        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    console.log(`Applied ${seeds.length} seed file(s).`);
  } finally {
    await client.end();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const seeds = await loadSeeds(options.seedsDir);
  printSeedPlan({ seeds, seedsDir: options.seedsDir });

  if (options.dryRun) {
    console.log("Dry run complete. No database changes were made.");
    return;
  }

  await applySeeds({
    databaseUrl: options.databaseUrl,
    seeds,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
