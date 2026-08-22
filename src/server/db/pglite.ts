import "server-only";

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "./schema";
import { DrizzleBriefRepository, type BriefRepository } from "./repository";

const migrationsFolder = resolve(process.cwd(), "drizzle");

export interface PgliteRepositoryHandle {
  repository: BriefRepository;
  close(): Promise<void>;
}

export async function applyPgliteMigrations(
  database: PgliteDatabase<typeof schema>,
): Promise<void> {
  await migrate(database, { migrationsFolder });
}

export async function createPgliteRepository(
  dataDir?: string,
): Promise<PgliteRepositoryHandle> {
  if (dataDir) {
    await mkdir(dirname(dataDir), { recursive: true });
  }

  const client = new PGlite(dataDir);
  const database = drizzle({ client, schema });

  try {
    await applyPgliteMigrations(database);
  } catch (error) {
    await client.close();
    throw error;
  }

  return {
    repository: new DrizzleBriefRepository(database),
    close: () => client.close(),
  };
}
