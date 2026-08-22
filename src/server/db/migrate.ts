import "server-only";

import nextEnv from "@next/env";
import { runMigrationsFromEnvironment } from "./migration";

export async function runMigrationCli(): Promise<void> {
  try {
    nextEnv.loadEnvConfig(process.cwd());
    await runMigrationsFromEnvironment();
  } catch {
    console.error("Database migration failed. Check the server-only database configuration.");
    process.exitCode = 1;
  }
}

void runMigrationCli();
