import "server-only";

import type { BriefAnalysis, BriefInput } from "@/contracts";
import { briefAnalysisSchema } from "@/contracts";

import {
  AnalysisProviderError,
  type AnalysisProvider,
  type AnalysisProviderName,
} from "./provider";
import { PROMPT_VERSION } from "./prompt";

export type AnalysisFailureCode =
  | "MODEL_TIMEOUT"
  | "MODEL_REFUSAL"
  | "MODEL_PROVIDER_ERROR"
  | "MODEL_INVALID_RESPONSE";

export type AnalysisOutcome =
  | {
      status: "completed";
      result: BriefAnalysis;
      failureCode: null;
      failureMessage: null;
      provider: AnalysisProviderName;
      model: string;
      promptVersion: string;
    }
  | {
      status: "failed";
      result: null;
      failureCode: AnalysisFailureCode;
      failureMessage: string;
      provider: AnalysisProviderName;
      model: string;
      promptVersion: string;
    };

export async function analyzeBrief(
  input: BriefInput,
  provider: AnalysisProvider,
  timeoutMs: number,
): Promise<AnalysisOutcome> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const output = await Promise.race([
      provider.generate(input, controller.signal),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new AnalysisTimeoutError());
        }, timeoutMs);
      }),
    ]);
    const result = parseProviderOutput(output);

    return {
      status: "completed",
      result,
      failureCode: null,
      failureMessage: null,
      provider: provider.name,
      model: provider.model,
      promptVersion: PROMPT_VERSION,
    };
  } catch (error) {
    if (error instanceof AnalysisTimeoutError) {
      return {
        status: "failed",
        result: null,
        failureCode: "MODEL_TIMEOUT",
        failureMessage: "Analysis took too long. Try again.",
        provider: provider.name,
        model: provider.model,
        promptVersion: PROMPT_VERSION,
      };
    }

    if (error instanceof AnalysisProviderError && error.code === "refusal") {
      return {
        status: "failed",
        result: null,
        failureCode: "MODEL_REFUSAL",
        failureMessage: "The provider could not analyze this brief. Try revising it.",
        provider: provider.name,
        model: provider.model,
        promptVersion: PROMPT_VERSION,
      };
    }

    if (error instanceof AnalysisProviderError) {
      return {
        status: "failed",
        result: null,
        failureCode: "MODEL_PROVIDER_ERROR",
        failureMessage: "Analysis is temporarily unavailable. Try again.",
        provider: provider.name,
        model: provider.model,
        promptVersion: PROMPT_VERSION,
      };
    }

    if (error instanceof InvalidAnalysisError) {
      return {
        status: "failed",
        result: null,
        failureCode: "MODEL_INVALID_RESPONSE",
        failureMessage: "The provider returned an invalid analysis. Try again.",
        provider: provider.name,
        model: provider.model,
        promptVersion: PROMPT_VERSION,
      };
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseProviderOutput(output: unknown): BriefAnalysis {
  let candidate = output;

  if (typeof output === "string") {
    try {
      candidate = JSON.parse(output) as unknown;
    } catch {
      throw new InvalidAnalysisError();
    }
  }

  const parsed = briefAnalysisSchema.safeParse(candidate);

  if (!parsed.success) {
    throw new InvalidAnalysisError();
  }

  return parsed.data;
}

class AnalysisTimeoutError extends Error {
  constructor() {
    super("analysis_timeout");
    this.name = "AnalysisTimeoutError";
  }
}

class InvalidAnalysisError extends Error {
  constructor() {
    super("invalid_analysis");
    this.name = "InvalidAnalysisError";
  }
}
