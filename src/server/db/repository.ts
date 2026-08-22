import "server-only";

import {
  and,
  desc,
  eq,
  lt,
  or,
  type InferInsertModel,
  type InferSelectModel,
} from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type {
  AnalysisRecord,
  BriefDetail,
  BriefInput,
  PersistedBrief,
} from "@/contracts";

import { analyses, briefs } from "./schema";
import * as schema from "./schema";

type BriefRow = InferSelectModel<typeof briefs>;
type AnalysisRow = InferSelectModel<typeof analyses>;
export type BriefInsert = InferInsertModel<typeof briefs>;
export type AnalysisInsert = InferInsertModel<typeof analyses>;

export interface PendingAnalysisRows {
  briefRow: BriefRow | undefined;
  analysisRow: AnalysisRow | undefined;
}

export type AtomicPendingAnalysisWriter = (
  briefValues: BriefInsert,
  analysisValues: AnalysisInsert,
) => Promise<PendingAnalysisRows>;

export interface AnalysisAttemptMetadata {
  provider: AnalysisRecord["provider"];
  model: string;
  promptVersion: string;
}

export type AnalysisPersistenceOutcome = Pick<
  AnalysisRecord,
  | "result"
  | "failureCode"
  | "failureMessage"
  | "provider"
  | "model"
  | "promptVersion"
> & { status: "completed" | "failed" };

export type BriefWithAnalysis = BriefDetail & { analysis: AnalysisRecord };

export type AnalysisRetryClaim =
  | { status: "claimed"; detail: BriefWithAnalysis }
  | {
      status: "conflict";
      reason: "pending" | "completed" | "missing_analysis";
      detail: BriefDetail;
    }
  | { status: "not_found" };

export interface BriefRepository {
  create(input: BriefInput): Promise<PersistedBrief>;
  createWithPendingAnalysis(
    input: BriefInput,
    metadata: AnalysisAttemptMetadata,
  ): Promise<BriefDetail>;
  list(): Promise<PersistedBrief[]>;
  findById(id: string): Promise<PersistedBrief | null>;
  findDetailById(id: string): Promise<BriefDetail | null>;
  saveAnalysisOutcome(
    analysisId: string,
    expectedUpdatedAt: Date,
    outcome: AnalysisPersistenceOutcome,
  ): Promise<BriefDetail | null>;
  claimAnalysisRetry(
    briefId: string,
    staleBefore: Date,
    metadata: AnalysisAttemptMetadata,
  ): Promise<AnalysisRetryClaim>;
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

const toAnalysisRecord = (row: AnalysisRow): AnalysisRecord => ({
  id: row.id,
  briefId: row.briefId,
  status: row.status as AnalysisRecord["status"],
  result: row.result as AnalysisRecord["result"],
  failureCode: row.failureCode,
  failureMessage: row.failureMessage,
  provider: row.provider as AnalysisRecord["provider"],
  model: row.model,
  promptVersion: row.promptVersion,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class DrizzleBriefRepository<TQueryResult extends PgQueryResultHKT>
  implements BriefRepository
{
  private readonly createPendingRows: AtomicPendingAnalysisWriter;

  constructor(
    private readonly database: PgDatabase<TQueryResult, typeof schema>,
    private readonly now: () => Date = () => new Date(),
    createPendingRows?: AtomicPendingAnalysisWriter,
  ) {
    this.createPendingRows =
      createPendingRows ??
      ((briefValues, analysisValues) =>
        this.database.transaction(async (transaction) => {
          const [briefRow] = await transaction
            .insert(briefs)
            .values(briefValues)
            .returning();

          if (!briefRow) {
            throw new Error("Brief insertion did not return a row.");
          }

          const [analysisRow] = await transaction
            .insert(analyses)
            .values(analysisValues)
            .returning();

          return { briefRow, analysisRow };
        }));
  }

  async create(input: BriefInput): Promise<PersistedBrief> {
    const now = this.now();
    const [row] = await this.database
      .insert(briefs)
      .values({ id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now })
      .returning();

    if (!row) {
      throw new Error("Brief insertion did not return a row.");
    }

    return toPersistedBrief(row);
  }

  async createWithPendingAnalysis(
    input: BriefInput,
    metadata: AnalysisAttemptMetadata,
  ): Promise<BriefDetail> {
    const now = this.now();
    const briefId = crypto.randomUUID();
    const { briefRow, analysisRow } = await this.createPendingRows(
      { id: briefId, ...input, createdAt: now, updatedAt: now },
      {
        id: crypto.randomUUID(),
        briefId,
        status: "pending",
        result: null,
        failureCode: null,
        failureMessage: null,
        ...metadata,
        createdAt: now,
        updatedAt: now,
      },
    );

    if (!briefRow) {
      throw new Error("Brief insertion did not return a row.");
    }

    if (!analysisRow) {
      throw new Error("Analysis insertion did not return a row.");
    }

    return {
      ...toPersistedBrief(briefRow),
      analysis: toAnalysisRecord(analysisRow),
    };
  }

  async list(): Promise<PersistedBrief[]> {
    const rows = await this.database
      .select()
      .from(briefs)
      .orderBy(desc(briefs.createdAt), desc(briefs.id));

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

  async findDetailById(id: string): Promise<BriefDetail | null> {
    const [row] = await this.database
      .select({ brief: briefs, analysis: analyses })
      .from(briefs)
      .leftJoin(analyses, eq(analyses.briefId, briefs.id))
      .where(eq(briefs.id, id))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      ...toPersistedBrief(row.brief),
      analysis: row.analysis ? toAnalysisRecord(row.analysis) : null,
    };
  }

  async saveAnalysisOutcome(
    analysisId: string,
    expectedUpdatedAt: Date,
    outcome: AnalysisPersistenceOutcome,
  ): Promise<BriefDetail | null> {
    const [analysisRow] = await this.database
      .update(analyses)
      .set({ ...outcome, updatedAt: this.now() })
      .where(
        and(
          eq(analyses.id, analysisId),
          eq(analyses.status, "pending"),
          eq(analyses.updatedAt, expectedUpdatedAt),
        ),
      )
      .returning();

    if (!analysisRow) {
      return null;
    }

    return this.findDetailById(analysisRow.briefId);
  }

  async claimAnalysisRetry(
    briefId: string,
    staleBefore: Date,
    metadata: AnalysisAttemptMetadata,
  ): Promise<AnalysisRetryClaim> {
    const [analysisRow] = await this.database
      .update(analyses)
      .set({
        status: "pending",
        result: null,
        failureCode: null,
        failureMessage: null,
        ...metadata,
        updatedAt: this.now(),
      })
      .where(
        and(
          eq(analyses.briefId, briefId),
          or(
            eq(analyses.status, "failed"),
            and(
              eq(analyses.status, "pending"),
              lt(analyses.updatedAt, staleBefore),
            ),
          ),
        ),
      )
      .returning();

    const detail = await this.findDetailById(briefId);

    if (!detail) {
      return { status: "not_found" };
    }

    if (analysisRow && detail.analysis) {
      return { status: "claimed", detail: { ...detail, analysis: detail.analysis } };
    }

    if (!detail.analysis) {
      return { status: "conflict", reason: "missing_analysis", detail };
    }

    return {
      status: "conflict",
      reason: detail.analysis.status === "completed" ? "completed" : "pending",
      detail,
    };
  }
}
