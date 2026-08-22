import "server-only";

import { desc, eq, type InferSelectModel } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { BriefInput, PersistedBrief } from "@/contracts";

import { briefs } from "./schema";
import * as schema from "./schema";

type BriefRow = InferSelectModel<typeof briefs>;

export interface BriefRepository {
  create(input: BriefInput): Promise<PersistedBrief>;
  list(): Promise<PersistedBrief[]>;
  findById(id: string): Promise<PersistedBrief | null>;
}

const toPersistedBrief = (row: BriefRow): PersistedBrief => ({
  id: row.id,
  title: row.title,
  description: row.description,
  contentType: row.contentType as PersistedBrief["contentType"],
  targetAudience: row.targetAudience,
  notes: row.notes,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class DrizzleBriefRepository<TQueryResult extends PgQueryResultHKT>
  implements BriefRepository
{
  constructor(
    private readonly database: PgDatabase<TQueryResult, typeof schema>,
  ) {}

  async create(input: BriefInput): Promise<PersistedBrief> {
    const now = new Date();
    const [row] = await this.database
      .insert(briefs)
      .values({ id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now })
      .returning();

    if (!row) {
      throw new Error("Brief insertion did not return a row.");
    }

    return toPersistedBrief(row);
  }

  async list(): Promise<PersistedBrief[]> {
    const rows = await this.database.select().from(briefs).orderBy(desc(briefs.createdAt));

    return rows.map(toPersistedBrief);
  }

  async findById(id: string): Promise<PersistedBrief | null> {
    const [row] = await this.database
      .select()
      .from(briefs)
      .where(eq(briefs.id, id))
      .limit(1);

    return row ? toPersistedBrief(row) : null;
  }
}
