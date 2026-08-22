// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { briefInputSchema } from "@/contracts";
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
