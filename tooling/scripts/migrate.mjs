import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";
import pg from "pg";

const { Client } = pg;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase/migrations");
const DEFAULT_MIGRATIONS_TABLE = "cms_schema_migrations";
const MIGRATION_LOCK_ID = 20260202;

for (const envPath of [path.join(REPO_ROOT, ".env"), path.join(REPO_ROOT, "apps/api/.env")]) {
  loadDotenv({ path: envPath, quiet: true });
}

function parseArgs(argv) {
  const options = {
    databaseUrl: process.env.DATABASE_URL,
    dryRun: false,
    help: false,
    migrationsDir: DEFAULT_MIGRATIONS_DIR,
    migrationsTable: process.env.MIGRATIONS_TABLE || DEFAULT_MIGRATIONS_TABLE,
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
        options.migrationsDir = path.resolve(REPO_ROOT, readFlagValue(argv, index, arg));
        index += 1;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--table":
        options.migrationsTable = readFlagValue(argv, index, arg);
        index += 1;
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
  console.log(`Usage: pnpm db:migrate -- [options]

Options:
  --dry-run              List migration files without connecting to the database
  --database-url <url>   Override DATABASE_URL
  --dir <path>           Migration directory, relative to repo root by default
  --table <name>         Migration metadata table (default: ${DEFAULT_MIGRATIONS_TABLE})
  --help                 Show this help
`);
}

function assertValidTableName(name) {
  if (!/^[a-z][a-z0-9_]*$/u.test(name)) {
    throw new Error(
      "--table must be a lowercase SQL identifier, for example cms_schema_migrations",
    );
  }
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

async function loadMigrations(migrationsDir) {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Migration directory does not exist: ${migrationsDir}`);
  }

  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const migrations = [];

  for (const file of files) {
    const absolutePath = path.join(migrationsDir, file);
    const sql = await readFile(absolutePath, "utf8");

    migrations.push({
      checksum: createHash("sha256").update(sql).digest("hex"),
      name: file,
      path: absolutePath,
      sql,
      version: path.basename(file, ".sql"),
    });
  }

  return migrations;
}

async function ensureMigrationsTable(client, tableName) {
  await client.query(`
    create table if not exists ${tableName} (
      version text primary key,
      name text not null,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
}

async function loadAppliedMigrations(client, tableName) {
  const result = await client.query(
    `select version, checksum from ${tableName} order by version asc`,
  );

  return new Map(result.rows.map((row) => [row.version, row.checksum]));
}

function printMigrationPlan({ migrations, migrationsDir, migrationsTable }) {
  console.log(`Migration directory: ${path.relative(REPO_ROOT, migrationsDir) || "."}`);
  console.log(`Migration table: ${migrationsTable}`);

  if (migrations.length === 0) {
    console.log("No SQL migration files found.");
    return;
  }

  console.log(`Found ${migrations.length} migration(s):`);

  for (const migration of migrations) {
    console.log(`- ${migration.name} ${migration.checksum.slice(0, 12)}`);
  }
}

async function applyMigrations({ databaseUrl, migrations, migrationsTable }) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required unless --dry-run is used");
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: resolveSsl(databaseUrl),
  });

  await client.connect();

  try {
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await ensureMigrationsTable(client, migrationsTable);

    const appliedMigrations = await loadAppliedMigrations(client, migrationsTable);
    const pendingMigrations = [];

    for (const migration of migrations) {
      const appliedChecksum = appliedMigrations.get(migration.version);

      if (appliedChecksum && appliedChecksum !== migration.checksum) {
        throw new Error(
          `Migration ${migration.name} was already applied with a different checksum`,
        );
      }

      if (!appliedChecksum) {
        pendingMigrations.push(migration);
      }
    }

    if (pendingMigrations.length === 0) {
      console.log("Database schema is already up to date.");
      return;
    }

    for (const migration of pendingMigrations) {
      console.log(`Applying ${migration.name}`);
      await client.query("begin");

      try {
        if (migration.sql.trim()) {
          await client.query(migration.sql);
        }

        await client.query(
          `insert into ${migrationsTable} (version, name, checksum) values ($1, $2, $3)`,
          [migration.version, migration.name, migration.checksum],
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    console.log(`Applied ${pendingMigrations.length} migration(s).`);
  } finally {
    try {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    } finally {
      await client.end();
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  assertValidTableName(options.migrationsTable);

  const migrations = await loadMigrations(options.migrationsDir);
  printMigrationPlan({
    migrations,
    migrationsDir: options.migrationsDir,
    migrationsTable: options.migrationsTable,
  });

  if (options.dryRun) {
    console.log("Dry run complete. No database changes were made.");
    return;
  }

  await applyMigrations({
    databaseUrl: options.databaseUrl,
    migrations,
    migrationsTable: options.migrationsTable,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
