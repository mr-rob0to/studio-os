// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createPgliteRepository } from "@/server/db/pglite";

import { listBriefs, listBriefsFromEnvironment } from "./queries";

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
