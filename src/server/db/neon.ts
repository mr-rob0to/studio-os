import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { DrizzleBriefRepository, type BriefRepository } from "./repository";
import * as schema from "./schema";

export function createNeonRepository(databaseUrl: string): BriefRepository {
  const database = drizzle({ client: neon(databaseUrl), schema });

  return new DrizzleBriefRepository(database);
}
