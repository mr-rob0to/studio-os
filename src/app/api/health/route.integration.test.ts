// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const originalEnvironment = {
  APP_ENV: process.env.APP_ENV,
  DATABASE_DRIVER: process.env.DATABASE_DRIVER,
  PGLITE_DATA_DIR: process.env.PGLITE_DATA_DIR,
  DATABASE_URL: process.env.DATABASE_URL,
  AI_PROVIDER: process.env.AI_PROVIDER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

describe("GET /api/health database integration", () => {
  beforeEach(() => {
    process.env.APP_ENV = "test";
    process.env.DATABASE_DRIVER = "pglite";
    delete process.env.PGLITE_DATA_DIR;
    delete process.env.DATABASE_URL;
    process.env.AI_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it("reports healthy after querying PGlite without requiring a provider", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "healthy",
      database: "ready",
    });
  });
});
