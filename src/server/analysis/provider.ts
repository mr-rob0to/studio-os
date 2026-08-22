import "server-only";

import type { BriefInput } from "@/contracts";

export type AnalysisProviderName = "mock" | "openai";

export interface AnalysisProvider {
  readonly name: AnalysisProviderName;
  readonly model: string;
  generate(input: BriefInput, signal: AbortSignal): Promise<unknown>;
}

export type AnalysisProviderFailureCode = "refusal" | "provider_failure";

export class AnalysisProviderError extends Error {
  constructor(
    readonly code: AnalysisProviderFailureCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "AnalysisProviderError";
  }
}
