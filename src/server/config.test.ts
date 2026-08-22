// @vitest-environment node

import { describe, expect, it } from "vitest";

import { parseApplicationEnvironment } from "@/server/config";

describe("application environment", () => {
  it("requires an explicit application environment and database driver", () => {
    expect(() => parseApplicationEnvironment({})).toThrow();
    expect(() =>
      parseApplicationEnvironment({ APP_ENV: "local" }),
    ).toThrow();
    expect(() =>
      parseApplicationEnvironment({ DATABASE_DRIVER: "pglite" }),
    ).toThrow();
  });

  it("allows PGlite only for local and test environments", () => {
    expect(
      parseApplicationEnvironment({
        APP_ENV: "local",
        DATABASE_DRIVER: "pglite",
        PGLITE_DATA_DIR: ".pglite/studio-os",
      }),
    ).toEqual({
      appEnvironment: "local",
      database: {
        driver: "pglite",
        dataDir: ".pglite/studio-os",
      },
    });
    expect(
      parseApplicationEnvironment({
        APP_ENV: "test",
        DATABASE_DRIVER: "pglite",
      }),
    ).toEqual({
      appEnvironment: "test",
      database: { driver: "pglite", dataDir: undefined },
    });
    expect(() =>
      parseApplicationEnvironment({
        APP_ENV: "preview",
        DATABASE_DRIVER: "pglite",
      }),
    ).toThrow();
    expect(() =>
      parseApplicationEnvironment({
        APP_ENV: "production",
        DATABASE_DRIVER: "pglite",
      }),
    ).toThrow();
  });

  it("requires a server-only database URL when Neon is selected", () => {
    expect(() =>
      parseApplicationEnvironment({
        APP_ENV: "preview",
        DATABASE_DRIVER: "neon",
      }),
    ).toThrow();
    expect(
      parseApplicationEnvironment({
        APP_ENV: "production",
        DATABASE_DRIVER: "neon",
        DATABASE_URL: "postgresql://example.invalid/studio_os",
      }),
    ).toEqual({
      appEnvironment: "production",
      database: {
        driver: "neon",
        databaseUrl: "postgresql://example.invalid/studio_os",
      },
    });
    expect(() =>
      parseApplicationEnvironment({
        APP_ENV: "production",
        DATABASE_DRIVER: "neon",
        NEXT_PUBLIC_DATABASE_URL: "postgresql://public.invalid/studio_os",
      }),
    ).toThrow();
  });

  it("rejects invalid environment values and ignores hosting-provider metadata", () => {
    expect(() =>
      parseApplicationEnvironment({
        APP_ENV: "staging",
        DATABASE_DRIVER: "neon",
        DATABASE_URL: "postgresql://example.invalid/studio_os",
      }),
    ).toThrow();
    expect(() =>
      parseApplicationEnvironment({
        APP_ENV: "local",
        DATABASE_DRIVER: "sqlite",
      }),
    ).toThrow();
    expect(
      parseApplicationEnvironment({
        APP_ENV: "local",
        DATABASE_DRIVER: "pglite",
        VERCEL_ENV: "production",
      }),
    ).toEqual({
      appEnvironment: "local",
      database: { driver: "pglite", dataDir: undefined },
    });
  });
});
