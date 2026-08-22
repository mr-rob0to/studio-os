// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import type { BriefInput } from "@/contracts";
import {
  AnalysisProviderError,
  type AnalysisProvider,
} from "@/server/analysis/provider";
import { PROMPT_VERSION } from "@/server/analysis/prompt";
import { analyzeBrief } from "@/server/analysis/service";

const brief: BriefInput = {
  title: "A quiet city wakes",
  description:
    "An animated short about a night-shift baker discovering that the city is alive before dawn.",
  contentType: "short_film",
  targetAudience: "Families who enjoy gentle, imaginative animation.",
  notes: null,
};

const validAnalysis = {
  recommendation: {
    decision: "ready_for_development",
    rationale:
      "The central discovery is clear, visually specific, and suitable for focused development.",
  },
  themes: ["Wonder", "Belonging"],
  classification: {
    format: "Animated short film",
    tone: ["Gentle", "Imaginative"],
    genreSignals: ["Magical realism"],
  },
  audience: {
    interpretation:
      "The brief points to families who value calm, imaginative stories with an emotional payoff.",
    audienceNeeds: ["A clear emotional through-line"],
    accessibilityConsiderations: ["Keep important story beats understandable without dialogue"],
  },
  strengths: ["The pre-dawn setting offers a distinctive visual identity"],
  opportunities: ["Clarify how the living city changes the baker's goal"],
  risksAndAmbiguities: ["The source of the city's life is not yet defined"],
  missingInformation: ["The intended running time is not specified"],
  nextActions: [
    {
      action: "Define the baker's decision at the end of the short",
      owner: "creative_lead",
      priority: "high",
    },
  ],
} as const;

describe("analysis service", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns only locally parsed successful analysis", async () => {
    const provider: AnalysisProvider = {
      name: "mock",
      model: "mock-v1",
      generate: async () => validAnalysis,
    };

    await expect(analyzeBrief(brief, provider, 100)).resolves.toEqual({
      status: "completed",
      result: validAnalysis,
      failureCode: null,
      failureMessage: null,
      provider: "mock",
      model: "mock-v1",
      promptVersion: PROMPT_VERSION,
    });
  });

  it("parses structured JSON text locally before returning success", async () => {
    const provider: AnalysisProvider = {
      name: "openai",
      model: "gpt-4o-mini",
      generate: async () => JSON.stringify(validAnalysis),
    };

    await expect(analyzeBrief(brief, provider, 100)).resolves.toMatchObject({
      status: "completed",
      result: validAnalysis,
    });
  });

  it("fails at the configured timeout boundary and aborts the provider", async () => {
    vi.useFakeTimers();
    let providerSignal: AbortSignal | undefined;
    const provider: AnalysisProvider = {
      name: "openai",
      model: "gpt-4o-mini",
      generate: async (_input, signal) => {
        providerSignal = signal;
        return new Promise<never>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new AnalysisProviderError("provider_failure")),
            { once: true },
          );
        });
      },
    };

    const outcome = analyzeBrief(brief, provider, 75);
    await vi.advanceTimersByTimeAsync(74);
    expect(providerSignal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);

    await expect(outcome).resolves.toEqual({
      status: "failed",
      result: null,
      failureCode: "MODEL_TIMEOUT",
      failureMessage: "Analysis took too long. Try again.",
      provider: "openai",
      model: "gpt-4o-mini",
      promptVersion: PROMPT_VERSION,
    });
    expect(providerSignal?.aborted).toBe(true);
  });

  it("returns a safe failed outcome when the provider refuses", async () => {
    const provider: AnalysisProvider = {
      name: "openai",
      model: "gpt-4o-mini",
      generate: async () => {
        throw new AnalysisProviderError("refusal");
      },
    };

    await expect(analyzeBrief(brief, provider, 100)).resolves.toMatchObject({
      status: "failed",
      result: null,
      failureCode: "MODEL_REFUSAL",
      failureMessage: "The provider could not analyze this brief. Try revising it.",
    });
  });

  it("does not expose provider failures as successful analysis", async () => {
    const provider: AnalysisProvider = {
      name: "openai",
      model: "gpt-4o-mini",
      generate: async () => {
        throw new AnalysisProviderError("provider_failure", {
          cause: new Error("raw upstream error"),
        });
      },
    };

    await expect(analyzeBrief(brief, provider, 100)).resolves.toMatchObject({
      status: "failed",
      result: null,
      failureCode: "MODEL_PROVIDER_ERROR",
      failureMessage: "Analysis is temporarily unavailable. Try again.",
    });
  });

  it("returns a failed outcome for malformed provider output", async () => {
    const provider: AnalysisProvider = {
      name: "mock",
      model: "mock-v1",
      generate: async () => ({ recommendation: { decision: "ship_it" } }),
    };

    await expect(analyzeBrief(brief, provider, 100)).resolves.toMatchObject({
      status: "failed",
      result: null,
      failureCode: "MODEL_INVALID_RESPONSE",
      failureMessage: "The provider returned an invalid analysis. Try again.",
    });
  });
});
