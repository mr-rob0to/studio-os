// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { briefInputSchema } from "@/contracts";
import { MockAnalysisProvider } from "@/server/analysis/mock";
import { analyzeBrief } from "@/server/analysis/service";
import { createPgliteRepository } from "@/server/db/pglite";
import { applyPgliteMigrations } from "@/server/db/pglite";
import { DrizzleBriefRepository } from "@/server/db/repository";
import { briefs } from "@/server/db/schema";
import * as schema from "@/server/db/schema";

const input = {
  title: "A quiet city wakes",
  description:
    "An animated short about a night-shift baker discovering that the city is alive before dawn.",
  contentType: "short_film" as const,
  targetAudience: "Families who enjoy gentle, imaginative animation.",
  notes: null,
};

describe("PGlite brief repository", () => {
  it("creates, lists, and retrieves a persisted brief", async () => {
    const { repository, close } = await createPgliteRepository();

    try {
      const created = await repository.create(input);

      await expect(repository.list()).resolves.toEqual([created]);
      await expect(repository.findById(created.id)).resolves.toEqual(created);
      await expect(repository.findById(crypto.randomUUID())).resolves.toBeNull();
    } finally {
      await close();
    }
  });

  it("persists a brief and its pending analysis together", async () => {
    const { repository, close } = await createPgliteRepository();

    try {
      const detail = await repository.createWithPendingAnalysis(input, {
        provider: "mock",
        model: "mock-v1",
        promptVersion: "2026-08-22",
      });

      expect(detail).toMatchObject({
        title: input.title,
        analysis: {
          briefId: detail.id,
          status: "pending",
          result: null,
          failureCode: null,
          failureMessage: null,
          provider: "mock",
          model: "mock-v1",
          promptVersion: "2026-08-22",
        },
      });
      await expect(repository.findDetailById(detail.id)).resolves.toEqual(detail);
    } finally {
      await close();
    }
  });

  it("persists a completed analysis only for the active attempt", async () => {
    const { repository, close } = await createPgliteRepository();

    try {
      const pending = await repository.createWithPendingAnalysis(input, {
        provider: "mock",
        model: "mock-v1",
        promptVersion: "2026-08-22",
      });
      const outcome = await analyzeBrief(
        input,
        new MockAnalysisProvider("success"),
        100,
      );

      const completed = await repository.saveAnalysisOutcome(
        pending.analysis!.id,
        pending.analysis!.updatedAt,
        outcome,
      );

      expect(completed?.analysis).toMatchObject({
        status: "completed",
        result: expect.objectContaining({ recommendation: expect.any(Object) }),
        failureCode: null,
        failureMessage: null,
      });
    } finally {
      await close();
    }
  });

  it("persists a safe failed analysis without persisting malformed output", async () => {
    const { repository, close } = await createPgliteRepository();

    try {
      const pending = await repository.createWithPendingAnalysis(input, {
        provider: "mock",
        model: "mock-v1",
        promptVersion: "2026-08-22",
      });
      const outcome = await analyzeBrief(
        input,
        new MockAnalysisProvider("malformed"),
        100,
      );

      const failed = await repository.saveAnalysisOutcome(
        pending.analysis!.id,
        pending.analysis!.updatedAt,
        outcome,
      );

      expect(failed?.analysis).toMatchObject({
        status: "failed",
        result: null,
        failureCode: "MODEL_INVALID_RESPONSE",
        failureMessage: "The provider returned an invalid analysis. Try again.",
      });
    } finally {
      await close();
    }
  });

  it("atomically claims a failed analysis for retry", async () => {
    const { repository, close } = await createPgliteRepository();

    try {
      const pending = await repository.createWithPendingAnalysis(input, {
        provider: "mock",
        model: "mock-v1",
        promptVersion: "2026-08-22",
      });
      const outcome = await analyzeBrief(
        input,
        new MockAnalysisProvider("malformed"),
        100,
      );
      await repository.saveAnalysisOutcome(
        pending.analysis!.id,
        pending.analysis!.updatedAt,
        outcome,
      );

      const claim = await repository.claimAnalysisRetry(
        pending.id,
        new Date(0),
        {
          provider: "openai",
          model: "gpt-4o-mini",
          promptVersion: "2026-08-22",
        },
      );

      expect(claim).toMatchObject({
        status: "claimed",
        detail: {
          id: pending.id,
          analysis: {
            status: "pending",
            result: null,
            failureCode: null,
            failureMessage: null,
            provider: "openai",
            model: "gpt-4o-mini",
          },
        },
      });
    } finally {
      await close();
    }
  });

  it("allows only one concurrent retry claim and therefore one provider owner", async () => {
    const { repository, close } = await createPgliteRepository();

    try {
      const pending = await repository.createWithPendingAnalysis(input, {
        provider: "mock",
        model: "mock-v1",
        promptVersion: "2026-08-22",
      });
      const failure = await analyzeBrief(
        input,
        new MockAnalysisProvider("malformed"),
        100,
      );
      await repository.saveAnalysisOutcome(
        pending.analysis!.id,
        pending.analysis!.updatedAt,
        failure,
      );

      const claims = await Promise.all([
        repository.claimAnalysisRetry(pending.id, new Date(0), {
          provider: "mock",
          model: "mock-v1",
          promptVersion: "2026-08-22",
        }),
        repository.claimAnalysisRetry(pending.id, new Date(0), {
          provider: "mock",
          model: "mock-v1",
          promptVersion: "2026-08-22",
        }),
      ]);

      expect(claims.filter((claim) => claim.status === "claimed")).toHaveLength(1);
      expect(claims.filter((claim) => claim.status === "conflict")).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("reclaims only pending work older than the stale cutoff", async () => {
    const client = new PGlite();
    const database = drizzle({ client, schema });
    let now = new Date("2026-08-22T12:00:00.000Z");
    const repository = new DrizzleBriefRepository(database, () => now);

    try {
      await applyPgliteMigrations(database);
      const pending = await repository.createWithPendingAnalysis(input, {
        provider: "mock",
        model: "mock-v1",
        promptVersion: "2026-08-22",
      });

      await expect(
        repository.claimAnalysisRetry(pending.id, pending.analysis!.updatedAt, {
          provider: "mock",
          model: "mock-v1",
          promptVersion: "2026-08-22",
        }),
      ).resolves.toMatchObject({ status: "conflict", reason: "pending" });

      now = new Date("2026-08-22T12:00:20.000Z");
      const reclaimed = await repository.claimAnalysisRetry(
        pending.id,
        new Date("2026-08-22T12:00:15.000Z"),
        {
          provider: "openai",
          model: "gpt-4o-mini",
          promptVersion: "2026-08-22",
        },
      );

      expect(reclaimed).toMatchObject({
        status: "claimed",
        detail: { analysis: { updatedAt: now, provider: "openai" } },
      });
    } finally {
      await client.close();
    }
  });

  it("prevents a late stale attempt from overwriting a reclaimed analysis", async () => {
    const client = new PGlite();
    const database = drizzle({ client, schema });
    let now = new Date("2026-08-22T12:00:00.000Z");
    const repository = new DrizzleBriefRepository(database, () => now);

    try {
      await applyPgliteMigrations(database);
      const original = await repository.createWithPendingAnalysis(input, {
        provider: "mock",
        model: "mock-v1",
        promptVersion: "2026-08-22",
      });
      now = new Date("2026-08-22T12:00:20.000Z");
      await repository.claimAnalysisRetry(
        original.id,
        new Date("2026-08-22T12:00:15.000Z"),
        {
          provider: "mock",
          model: "mock-v1",
          promptVersion: "2026-08-22",
        },
      );
      const originalOutcome = await analyzeBrief(
        input,
        new MockAnalysisProvider("success"),
        100,
      );

      await expect(
        repository.saveAnalysisOutcome(
          original.analysis!.id,
          original.analysis!.updatedAt,
          originalOutcome,
        ),
      ).resolves.toBeNull();
      await expect(repository.findDetailById(original.id)).resolves.toMatchObject({
        analysis: { status: "pending", updatedAt: now },
      });
    } finally {
      await client.close();
    }
  });

  it("allows a future content type in PostgreSQL while the application boundary rejects it", async () => {
    const client = new PGlite();
    const database = drizzle({ client, schema });

    try {
      await applyPgliteMigrations(database);
      await database.insert(briefs).values({
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description,
        contentType: "immersive_experience",
        targetAudience: input.targetAudience,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(
        briefInputSchema.safeParse({
          ...input,
          contentType: "immersive_experience",
        }).success,
      ).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("lists newest briefs first and orders equal timestamps by descending id", async () => {
    const client = new PGlite();
    const database = drizzle({ client, schema });
    const repository = new DrizzleBriefRepository(database);
    const oldest = "00000000-0000-4000-8000-000000000001";
    const tiedLowerId = "00000000-0000-4000-8000-000000000002";
    const tiedHigherId = "00000000-0000-4000-8000-000000000003";
    const newest = "00000000-0000-4000-8000-000000000004";
    const tiedCreatedAt = new Date("2026-08-22T12:00:00.000Z");

    try {
      await applyPgliteMigrations(database);
      await database.insert(briefs).values([
        { ...input, id: oldest, createdAt: new Date("2026-08-22T11:00:00.000Z"), updatedAt: tiedCreatedAt },
        { ...input, id: tiedLowerId, createdAt: tiedCreatedAt, updatedAt: tiedCreatedAt },
        { ...input, id: tiedHigherId, createdAt: tiedCreatedAt, updatedAt: tiedCreatedAt },
        { ...input, id: newest, createdAt: new Date("2026-08-22T13:00:00.000Z"), updatedAt: tiedCreatedAt },
      ]);

      await expect(repository.list()).resolves.toMatchObject([
        { id: newest },
        { id: tiedHigherId },
        { id: tiedLowerId },
        { id: oldest },
      ]);
    } finally {
      await client.close();
    }
  });
});
