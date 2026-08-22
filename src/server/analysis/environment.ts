import "server-only";

import { z } from "zod";

import type { AnalysisProvider } from "./provider";

const timeoutSchema = z.coerce.number().int().positive().max(60_000).default(12_000);

const mockEnvironmentSchema = z.object({
  AI_PROVIDER: z.literal("mock"),
  AI_TIMEOUT_MS: timeoutSchema,
  MOCK_AI_MODE: z.enum(["success", "timeout", "malformed"]).default("success"),
});

const openAiEnvironmentSchema = z.object({
  AI_PROVIDER: z.literal("openai"),
  AI_TIMEOUT_MS: timeoutSchema,
  OPENAI_API_KEY: z.string().trim().min(1),
  OPENAI_MODEL: z.string().trim().min(1).max(80).default("gpt-4o-mini"),
});

const analysisEnvironmentSchema = z.discriminatedUnion("AI_PROVIDER", [
  mockEnvironmentSchema,
  openAiEnvironmentSchema,
]);

export type AnalysisEnvironment = Record<string, string | undefined>;

export type AnalysisConfiguration =
  | {
      provider: "mock";
      timeoutMs: number;
      mockMode: "success" | "timeout" | "malformed";
    }
  | {
      provider: "openai";
      timeoutMs: number;
      apiKey: string;
      model: string;
    };

export interface AnalysisRuntime {
  provider: AnalysisProvider;
  timeoutMs: number;
}

export interface AnalysisProviderFactories {
  createMockProvider(
    mode: "success" | "timeout" | "malformed",
  ): AnalysisProvider | Promise<AnalysisProvider>;
  createOpenAiProvider(
    apiKey: string,
    model: string,
  ): AnalysisProvider | Promise<AnalysisProvider>;
}

const providerFactories: AnalysisProviderFactories = {
  async createMockProvider(mode) {
    const { MockAnalysisProvider } = await import("./mock");
    return new MockAnalysisProvider(mode);
  },
  async createOpenAiProvider(apiKey, model) {
    const { OpenAIAnalysisProvider } = await import("./openai");
    return new OpenAIAnalysisProvider(apiKey, model);
  },
};

export function parseAnalysisEnvironment(
  environment: AnalysisEnvironment,
): AnalysisConfiguration {
  const configuration = analysisEnvironmentSchema.parse(environment);

  if (configuration.AI_PROVIDER === "mock") {
    return {
      provider: "mock",
      timeoutMs: configuration.AI_TIMEOUT_MS,
      mockMode: configuration.MOCK_AI_MODE,
    };
  }

  return {
    provider: "openai",
    timeoutMs: configuration.AI_TIMEOUT_MS,
    apiKey: configuration.OPENAI_API_KEY,
    model: configuration.OPENAI_MODEL,
  };
}

export async function createAnalysisRuntimeFromEnvironment(
  environment: AnalysisEnvironment = process.env,
  factories: AnalysisProviderFactories = providerFactories,
): Promise<AnalysisRuntime> {
  const configuration = parseAnalysisEnvironment(environment);

  if (configuration.provider === "mock") {
    return {
      provider: await factories.createMockProvider(configuration.mockMode),
      timeoutMs: configuration.timeoutMs,
    };
  }

  return {
    provider: await factories.createOpenAiProvider(
      configuration.apiKey,
      configuration.model,
    ),
    timeoutMs: configuration.timeoutMs,
  };
}
