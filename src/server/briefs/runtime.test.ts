// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { AnalysisProvider } from "@/server/analysis/provider";
import type { BriefRepository } from "@/server/db/repository";
import { createBriefWorkflowRuntimeFromEnvironment } from "@/server/briefs/runtime";

describe("brief workflow runtime composition", () => {
  it("does not compose a database or provider until explicitly requested", async () => {
    const close = vi.fn(async () => {});
    const createRepository = vi.fn(async () => ({
      repository: {} as BriefRepository,
      close,
    }));
    const createAnalysisRuntime = vi.fn(async () => ({
      provider: {} as AnalysisProvider,
      timeoutMs: 100,
    }));

    expect(createRepository).not.toHaveBeenCalled();
    expect(createAnalysisRuntime).not.toHaveBeenCalled();

    const runtime = await createBriefWorkflowRuntimeFromEnvironment(
      {
        APP_ENV: "test",
        DATABASE_DRIVER: "pglite",
        AI_PROVIDER: "mock",
      },
      { createRepository, createAnalysisRuntime },
    );

    expect(createAnalysisRuntime).toHaveBeenCalledTimes(1);
    expect(createRepository).toHaveBeenCalledTimes(1);
    await runtime.close();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
