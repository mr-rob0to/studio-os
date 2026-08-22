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
        {
          APP_ENV: "production",
          DATABASE_DRIVER: "neon",
          DATABASE_URL: "postgresql://example",
        },
        { createNeonRepository, createPgliteRepository },
      ),
    ).resolves.toMatchObject({ repository });

    expect(createNeonRepository).toHaveBeenCalledWith("postgresql://example");
    expect(createPgliteRepository).not.toHaveBeenCalled();
  });

  it("selects the default Neon adapter without importing PGlite", async () => {
    await expect(
      createRepositoryFromEnvironment({
        APP_ENV: "preview",
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
        { APP_ENV: "preview", DATABASE_DRIVER: "neon" },
        { createNeonRepository, createPgliteRepository },
      ),
    ).rejects.toThrow();

    expect(createNeonRepository).not.toHaveBeenCalled();
    expect(createPgliteRepository).not.toHaveBeenCalled();
  });

  it.each(["preview", "production"] as const)(
    "fails closed before PGlite can load in %s",
    async (appEnvironment) => {
    const createNeonRepository = vi.fn(() => repository);
    const createPgliteRepository = vi.fn();

    await expect(
      createRepositoryFromEnvironment(
        { APP_ENV: appEnvironment, DATABASE_DRIVER: "pglite" },
        { createNeonRepository, createPgliteRepository },
      ),
    ).rejects.toThrow();

    expect(createNeonRepository).not.toHaveBeenCalled();
    expect(createPgliteRepository).not.toHaveBeenCalled();
    },
  );

  it("selects PGlite only from explicit local application configuration", async () => {
    const createNeonRepository = vi.fn(() => repository);
    const createPgliteRepository = vi.fn(async () => ({
      repository,
      close: vi.fn(async () => {}),
    }));

    await expect(
      createRepositoryFromEnvironment(
        {
          APP_ENV: "local",
          DATABASE_DRIVER: "pglite",
          PGLITE_DATA_DIR: ".pglite/studio-os",
          VERCEL_ENV: "production",
        },
        { createNeonRepository, createPgliteRepository },
      ),
    ).resolves.toMatchObject({ repository });

    expect(createPgliteRepository).toHaveBeenCalledWith(".pglite/studio-os");
    expect(createNeonRepository).not.toHaveBeenCalled();
  });

  it("rejects missing application configuration before loading an adapter", async () => {
    const createNeonRepository = vi.fn(() => repository);
    const createPgliteRepository = vi.fn();

    await expect(
      createRepositoryFromEnvironment(
        {},
        { createNeonRepository, createPgliteRepository },
      ),
    ).rejects.toThrow();

    expect(createNeonRepository).not.toHaveBeenCalled();
    expect(createPgliteRepository).not.toHaveBeenCalled();
  });
});
