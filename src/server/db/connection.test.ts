// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { BriefRepository } from "@/server/db/repository";
import { createRepositoryFromEnvironment } from "@/server/db/connection";

vi.mock("@electric-sql/pglite", () => {
  throw new Error("PGlite must not load on the Neon path.");
});

const repository = {} as BriefRepository;

describe("database environment composition", () => {
  it("selects Neon without loading or creating PGlite", async () => {
    const createNeonRepository = vi.fn(() => repository);
    const createPgliteRepository = vi.fn();

    await expect(
      createRepositoryFromEnvironment(
        { DATABASE_DRIVER: "neon", DATABASE_URL: "postgresql://example" },
        { createNeonRepository, createPgliteRepository },
      ),
    ).resolves.toMatchObject({ repository });

    expect(createNeonRepository).toHaveBeenCalledWith("postgresql://example");
    expect(createPgliteRepository).not.toHaveBeenCalled();
  });

  it("selects the default Neon adapter without importing PGlite", async () => {
    await expect(
      createRepositoryFromEnvironment({
        DATABASE_DRIVER: "neon",
        DATABASE_URL: "postgresql://test_user:test_password@example.invalid/studio_os",
      }),
    ).resolves.toMatchObject({ repository: expect.anything() });
  });

  it("rejects Neon configuration without a database URL before loading an adapter", async () => {
    const createNeonRepository = vi.fn(() => repository);
    const createPgliteRepository = vi.fn();

    await expect(
      createRepositoryFromEnvironment(
        { DATABASE_DRIVER: "neon" },
        { createNeonRepository, createPgliteRepository },
      ),
    ).rejects.toThrow("DATABASE_URL is required when DATABASE_DRIVER=neon.");

    expect(createNeonRepository).not.toHaveBeenCalled();
    expect(createPgliteRepository).not.toHaveBeenCalled();
  });

  it("fails closed before PGlite can load in preview or production", async () => {
    const createNeonRepository = vi.fn(() => repository);
    const createPgliteRepository = vi.fn();

    await expect(
      createRepositoryFromEnvironment(
        { VERCEL_ENV: "production" },
        { createNeonRepository, createPgliteRepository },
      ),
    ).rejects.toThrow("DATABASE_DRIVER must be neon in Vercel preview and production.");

    expect(createNeonRepository).not.toHaveBeenCalled();
    expect(createPgliteRepository).not.toHaveBeenCalled();
  });
});
