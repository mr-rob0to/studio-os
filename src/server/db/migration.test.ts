// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { runMigrationsFromEnvironment } from "@/server/db/migration";

describe("database migration composition", () => {
  it("rejects hosted PGlite before loading either migration adapter", async () => {
    const migratePglite = vi.fn(async () => {});
    const migrateNeon = vi.fn(async () => {});

    await expect(
      runMigrationsFromEnvironment(
        { APP_ENV: "production", DATABASE_DRIVER: "pglite" },
        { migratePglite, migrateNeon },
      ),
    ).rejects.toThrow();

    expect(migratePglite).not.toHaveBeenCalled();
    expect(migrateNeon).not.toHaveBeenCalled();
  });

  it("uses only the explicitly selected migration adapter", async () => {
    const migratePglite = vi.fn(async () => {});
    const migrateNeon = vi.fn(async () => {});

    await runMigrationsFromEnvironment(
      {
        APP_ENV: "local",
        DATABASE_DRIVER: "pglite",
        PGLITE_DATA_DIR: ".pglite/test",
      },
      { migratePglite, migrateNeon },
    );
    expect(migratePglite).toHaveBeenCalledWith(".pglite/test");
    expect(migrateNeon).not.toHaveBeenCalled();

    migratePglite.mockClear();
    await runMigrationsFromEnvironment(
      {
        APP_ENV: "production",
        DATABASE_DRIVER: "neon",
        DATABASE_URL: "postgresql://example.invalid/studio_os",
      },
      { migratePglite, migrateNeon },
    );
    expect(migrateNeon).toHaveBeenCalledWith(
      "postgresql://example.invalid/studio_os",
    );
    expect(migratePglite).not.toHaveBeenCalled();
  });
});
