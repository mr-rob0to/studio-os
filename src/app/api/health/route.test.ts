// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  checkReadiness: vi.fn(),
}));
const providerMocks = vi.hoisted(() => ({
  createRuntime: vi.fn(),
}));

vi.mock("@/server/db/health", () => ({
  checkDatabaseReadinessFromEnvironment: databaseMocks.checkReadiness,
}));
vi.mock("@/server/analysis/environment", () => ({
  createAnalysisRuntimeFromEnvironment: providerMocks.createRuntime,
}));

import { dynamic, GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    databaseMocks.checkReadiness.mockReset();
    providerMocks.createRuntime.mockReset();
  });

  it("reports healthy only after the database proves readiness", async () => {
    databaseMocks.checkReadiness.mockResolvedValue(undefined);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "healthy",
      database: "ready",
    });
    expect(databaseMocks.checkReadiness).toHaveBeenCalledTimes(1);
  });

  it("reports a safe degraded response when database readiness fails", async () => {
    databaseMocks.checkReadiness.mockRejectedValue(
      new Error(
        "postgresql://secret-user:secret-pass@example.invalid/studio_os query SELECT stack provider=openai",
      ),
    );

    const response = await GET();
    const rawBody = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(rawBody)).toEqual({
      status: "degraded",
      database: "unavailable",
    });
    expect(rawBody).not.toMatch(
      /secret-user|secret-pass|example\.invalid|studio_os|SELECT|stack|openai/i,
    );
  });

  it("returns degraded when database readiness exceeds two seconds", async () => {
    vi.useFakeTimers();
    databaseMocks.checkReadiness.mockImplementation(
      () => new Promise<void>(() => {}),
    );

    try {
      let response: Response | undefined;
      void GET().then((result) => {
        response = result;
      });

      await vi.advanceTimersByTimeAsync(1_999);
      expect(response).toBeUndefined();

      await vi.advanceTimersByTimeAsync(1);
      expect(response?.status).toBe(503);
      await expect(response?.json()).resolves.toEqual({
        status: "degraded",
        database: "unavailable",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("prevents healthy and degraded responses from being cached", async () => {
    databaseMocks.checkReadiness.mockResolvedValueOnce(undefined);
    const healthy = await GET();
    databaseMocks.checkReadiness.mockRejectedValueOnce(new Error("offline"));
    const degraded = await GET();

    expect(dynamic).toBe("force-dynamic");
    expect(healthy.headers.get("cache-control")).toBe("no-store");
    expect(degraded.headers.get("cache-control")).toBe("no-store");
  });

  it("never creates or invokes an analysis provider", async () => {
    databaseMocks.checkReadiness.mockResolvedValue(undefined);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(providerMocks.createRuntime).not.toHaveBeenCalled();
  });
});
