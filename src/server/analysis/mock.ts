import "server-only";

import type { BriefInput } from "@/contracts";

import {
  AnalysisProviderError,
  type AnalysisProvider,
} from "./provider";

export type MockAnalysisMode = "success" | "timeout" | "malformed";

export class MockAnalysisProvider implements AnalysisProvider {
  readonly name = "mock" as const;
  readonly model = "mock-v1";

  constructor(private readonly mode: MockAnalysisMode = "success") {}

  async generate(input: BriefInput, signal: AbortSignal): Promise<unknown> {
    if (this.mode === "timeout") {
      return new Promise<never>((_resolve, reject) => {
        const rejectForAbort = () =>
          reject(new AnalysisProviderError("provider_failure"));

        if (signal.aborted) {
          rejectForAbort();
          return;
        }

        signal.addEventListener("abort", rejectForAbort, { once: true });
      });
    }

    if (this.mode === "malformed") {
      return { recommendation: { decision: "unsupported" } };
    }

    const audienceSummary = input.targetAudience.slice(0, 430);

    return {
      recommendation: {
        decision: "needs_discussion",
        rationale: `${input.title} has a clear premise, but the team should align on the intended development outcome.`,
      },
      themes: ["Creative intent", "Audience connection"],
      classification: {
        format: input.contentType.replaceAll("_", " "),
        tone: ["Imaginative"],
        genreSignals: [],
      },
      audience: {
        interpretation: `The stated audience is ${audienceSummary}`,
        audienceNeeds: ["A clear emotional and narrative through-line"],
        accessibilityConsiderations: [
          "Keep essential story information understandable without relying only on dialogue",
        ],
      },
      strengths: ["The submitted brief gives the team a concrete premise to discuss"],
      opportunities: ["Connect the central idea to a specific character decision"],
      risksAndAmbiguities: ["The intended creative outcome needs team alignment"],
      missingInformation: input.notes
        ? []
        : ["No additional production or creative notes were supplied"],
      nextActions: [
        {
          action: "Confirm the central character decision and desired audience response",
          owner: "creative_lead",
          priority: "high",
        },
      ],
    };
  }
}
