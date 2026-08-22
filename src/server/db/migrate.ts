import "server-only";

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import nextEnv from "@next/env";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { neon } from "@neondatabase/serverless";

import { applyPgliteMigrations } from "./pglite";
import * as schema from "./schema";

const migrationsFolder = resolve(process.cwd(), "drizzle");

function requiredDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when DATABASE_DRIVER=neon.");
  }

  return databaseUrl;
}

export async function runMigrations(): Promise<void> {
  const driver = process.env.DATABASE_DRIVER ?? "pglite";

  if (driver === "pglite") {
    const dataDir = process.env.PGLITE_DATA_DIR ?? ".pglite/studio-os";
    await mkdir(dirname(dataDir), { recursive: true });
    const client = new PGlite(dataDir);

    try {
      await applyPgliteMigrations(drizzlePglite({ client, schema }));
    } finally {
      await client.close();
    }

    return;
  }

  if (driver === "neon") {
    const database = drizzleNeon({ client: neon(requiredDatabaseUrl()), schema });
    await migrateNeon(database, { migrationsFolder });
    return;
  }

  throw new Error("DATABASE_DRIVER must be either pglite or neon.");
}

export async function runMigrationCli(): Promise<void> {
  try {
    nextEnv.loadEnvConfig(process.cwd());
    await runMigrations();
  } catch {
    console.error("Database migration failed. Check the server-only database configuration.");
    process.exitCode = 1;
  }
}

void runMigrationCli();
