// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  createAnalysisRuntimeFromEnvironment,
  parseAnalysisEnvironment,
} from "@/server/analysis/environment";
import {
  AnalysisProviderError,
  type AnalysisProvider,
} from "@/server/analysis/provider";
import { analyzeBrief } from "@/server/analysis/service";

const brief = {
  title: "A quiet city wakes",
  description:
    "An animated short about a baker discovering that the city is alive before dawn.",
  contentType: "short_film" as const,
  targetAudience: "Families who enjoy gentle imaginative animation.",
  notes: null,
};

describe("analysis provider environment", () => {
  it("parses an explicit mock provider and timeout without hosting metadata", () => {
    expect(
      parseAnalysisEnvironment({
        AI_PROVIDER: "mock",
        AI_TIMEOUT_MS: "75",
        MOCK_AI_MODE: "success",
        VERCEL_ENV: "production",
      }),
    ).toEqual({
      provider: "mock",
      timeoutMs: 75,
      mockMode: "success",
    });
  });

  it("rejects missing provider selection, invalid timeout, and missing OpenAI credentials", () => {
    expect(() => parseAnalysisEnvironment({})).toThrow();
    expect(() =>
      parseAnalysisEnvironment({ AI_PROVIDER: "mock", AI_TIMEOUT_MS: "0" }),
    ).toThrow();
    expect(() =>
      parseAnalysisEnvironment({ AI_PROVIDER: "openai" }),
    ).toThrow();
  });

  it("never falls back to mock when the selected OpenAI provider cannot start", async () => {
    const upstreamError = new Error("OpenAI client failed");
    const createMockProvider = vi.fn(() => ({}) as AnalysisProvider);
    const createOpenAiProvider = vi.fn(() => {
      throw upstreamError;
    });

    await expect(
      createAnalysisRuntimeFromEnvironment(
        {
          AI_PROVIDER: "openai",
          AI_TIMEOUT_MS: "12000",
          OPENAI_API_KEY: "test-key",
          OPENAI_MODEL: "gpt-4o-mini",
        },
        { createMockProvider, createOpenAiProvider },
      ),
    ).rejects.toBe(upstreamError);

    expect(createOpenAiProvider).toHaveBeenCalledWith("test-key", "gpt-4o-mini");
    expect(createMockProvider).not.toHaveBeenCalled();
  });

  it("never falls back to mock output after an OpenAI generation failure", async () => {
    const openAiProvider: AnalysisProvider = {
      name: "openai",
      model: "gpt-4o-mini",
      generate: async () => {
        throw new AnalysisProviderError("provider_failure");
      },
    };
    const createMockProvider = vi.fn(() => ({}) as AnalysisProvider);
    const runtime = await createAnalysisRuntimeFromEnvironment(
      {
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "test-key",
      },
      {
        createMockProvider,
        createOpenAiProvider: () => openAiProvider,
      },
    );

    await expect(
      analyzeBrief(brief, runtime.provider, runtime.timeoutMs),
    ).resolves.toMatchObject({
      status: "failed",
      result: null,
      failureCode: "MODEL_PROVIDER_ERROR",
      provider: "openai",
    });
    expect(createMockProvider).not.toHaveBeenCalled();
  });
});
