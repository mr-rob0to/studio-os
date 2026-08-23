// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { BriefDetail } from "@/contracts";
import { createPgliteRepository } from "@/server/db/pglite";

import {
  findBriefDetail,
  findBriefDetailFromEnvironment,
  listBriefs,
  listBriefsFromEnvironment,
} from "./queries";

const input = {
  title: "A quiet city wakes",
  description:
    "An animated short about a baker discovering that the city is alive before dawn.",
  contentType: "short_film" as const,
  targetAudience: "Families who enjoy gentle imaginative animation.",
  notes: null,
};

describe("brief queries", () => {
  it("returns persisted briefs through the repository interface", async () => {
    const handle = await createPgliteRepository();

    try {
      const created = await handle.repository.create(input);

      await expect(listBriefs(handle.repository)).resolves.toEqual([created]);
    } finally {
      await handle.close();
    }
  });

  it("reads a persisted brief and analysis through the detail query", async () => {
    const handle = await createPgliteRepository();

    try {
      const created = await handle.repository.createWithPendingAnalysis(input, {
        provider: "mock",
        model: "mock-v1",
        promptVersion: "analysis-v2",
      });

      await expect(findBriefDetail(handle.repository, created.id)).resolves.toEqual(
        created,
      );
    } finally {
      await handle.close();
    }
  });

  it("returns one persisted brief with its analysis and closes the database handle", async () => {
    const detail: BriefDetail = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date("2026-08-22T12:00:00.000Z"),
      updatedAt: new Date("2026-08-22T12:00:00.000Z"),
      analysis: null,
    };
    const findDetailById = vi.fn(async () => detail);
    const close = vi.fn(async () => {});
    const createRepository = vi.fn(async () => ({
      repository: { findDetailById },
      close,
    }));

    await expect(
      findBriefDetailFromEnvironment(
        detail.id,
        { APP_ENV: "test", DATABASE_DRIVER: "pglite" },
        createRepository,
      ),
    ).resolves.toBe(detail);
    expect(findDetailById).toHaveBeenCalledWith(detail.id);
    expect(close).toHaveBeenCalledTimes(1);
    await expect(
      findBriefDetail({ findDetailById }, detail.id),
    ).resolves.toBe(detail);
  });

  it("closes the database handle when a list read fails", async () => {
    const close = vi.fn(async () => {});
    const createRepository = vi.fn(async () => ({
      repository: {
        list: vi.fn(async () => {
          throw new Error("database unavailable");
        }),
      },
      close,
    }));

    await expect(
      listBriefsFromEnvironment(
        { APP_ENV: "test", DATABASE_DRIVER: "pglite" },
        createRepository,
      ),
    ).rejects.toThrow("database unavailable");
    expect(close).toHaveBeenCalledTimes(1);
  });
});
