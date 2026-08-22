import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import {
  type AnalysisInsert,
  type AtomicPendingAnalysisWriter,
  type BriefInsert,
  DrizzleBriefRepository,
  type BriefRepository,
} from "./repository";
import { analyses, briefs } from "./schema";
import * as schema from "./schema";

export function createNeonRepository(databaseUrl: string): BriefRepository {
  const database = drizzle({ client: neon(databaseUrl), schema });

  return new DrizzleBriefRepository(
    database,
    undefined,
    createNeonPendingAnalysisWriter(database),
  );
}

export function createNeonPendingAnalysisWriter(
  database: NeonHttpDatabase<typeof schema>,
): AtomicPendingAnalysisWriter {
  return async (briefValues: BriefInsert, analysisValues: AnalysisInsert) => {
    const [briefRows, analysisRows] = await database.batch([
      database.insert(briefs).values(briefValues).returning(),
      database.insert(analyses).values(analysisValues).returning(),
    ]);

    return {
      briefRow: briefRows[0],
      analysisRow: analysisRows[0],
    };
  };
}
