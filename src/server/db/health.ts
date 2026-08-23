import "server-only";

import type { ApplicationEnvironment } from "@/server/config";

import { createRepositoryFromEnvironment } from "./connection";

const READINESS_PROBE_ID = "00000000-0000-0000-0000-000000000000";

export async function checkDatabaseReadinessFromEnvironment(
  environment: ApplicationEnvironment = process.env,
): Promise<void> {
  const database = await createRepositoryFromEnvironment(environment);

  try {
    await database.repository.findById(READINESS_PROBE_ID);
  } finally {
    await database.close();
  }
}
