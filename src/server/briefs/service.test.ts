// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { BriefInput } from "@/contracts";
import {
  AnalysisProviderError,
  type AnalysisProvider,
} from "@/server/analysis/provider";
import { createPgliteRepository } from "@/server/db/pglite";
import {
  AnalysisRetryConflictError,
  BriefNotFoundError,
  BriefWorkflowService,
} from "@/server/briefs/service";

const input: BriefInput = {
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
    accessibilityConsiderations: [
      "Keep important story beats understandable without dialogue",
    ],
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

describe("brief workflow service", () => {
  it("persists the brief and pending analysis before provider execution", async () => {
    const { repository, close } = await createPgliteRepository();
    let observedPending = false;
    const provider: AnalysisProvider = {
      name: "mock",
      model: "mock-v1",
      generate: async () => {
        const briefs = await repository.list();
        expect(briefs).toHaveLength(1);
        await expect(repository.findDetailById(briefs[0]!.id)).resolves.toMatchObject({
          analysis: { status: "pending" },
        });
        observedPending = true;
        return validAnalysis;
      },
    };
    const service = new BriefWorkflowService(repository, provider, 100);

    try {
      const detail = await service.create(input);

      expect(observedPending).toBe(true);
      expect(detail.analysis).toMatchObject({
        status: "completed",
        result: validAnalysis,
      });
    } finally {
      await close();
    }
  });

  it.each([
    {
      name: "refusal",
      provider: {
        name: "openai" as const,
        model: "gpt-4o-mini",
        generate: async () => {
          throw new AnalysisProviderError("refusal");
        },
      },
      expectedCode: "MODEL_REFUSAL",
    },
    {
      name: "provider failure",
      provider: {
        name: "openai" as const,
        model: "gpt-4o-mini",
        generate: async () => {
          throw new AnalysisProviderError("provider_failure");
        },
      },
      expectedCode: "MODEL_PROVIDER_ERROR",
    },
    {
      name: "malformed output",
      provider: {
        name: "mock" as const,
        model: "mock-v1",
        generate: async () => ({ recommendation: { decision: "invalid" } }),
      },
      expectedCode: "MODEL_INVALID_RESPONSE",
    },
    {
      name: "timeout",
      provider: {
        name: "mock" as const,
        model: "mock-v1",
        generate: async () => new Promise<never>(() => {}),
      },
      expectedCode: "MODEL_TIMEOUT",
    },
  ])("persists $name as a safe failed analysis", async ({ provider, expectedCode }) => {
    const { repository, close } = await createPgliteRepository();
    const service = new BriefWorkflowService(repository, provider, 5);

    try {
      const detail = await service.create(input);

      expect(detail.analysis).toMatchObject({
        status: "failed",
        result: null,
        failureCode: expectedCode,
        failureMessage: expect.any(String),
      });
      await expect(repository.findDetailById(detail.id)).resolves.toEqual(detail);
    } finally {
      await close();
    }
  });

  it("retries a failed analysis without creating another brief or analysis", async () => {
    const { repository, close } = await createPgliteRepository();
    let providerCallCount = 0;
    const providerInputs: BriefInput[] = [];
    const provider: AnalysisProvider = {
      name: "mock",
      model: "mock-v1",
      generate: async (providerInput) => {
        providerCallCount += 1;
        providerInputs.push(providerInput);
        return providerCallCount === 1
          ? { recommendation: { decision: "invalid" } }
          : validAnalysis;
      },
    };
    const service = new BriefWorkflowService(repository, provider, 100);

    try {
      const failed = await service.create(input);
      const retried = await service.retry(failed.id);

      expect(retried.id).toBe(failed.id);
      expect(retried.analysis?.id).toBe(failed.analysis?.id);
      expect(retried.analysis).toMatchObject({ status: "completed" });
      await expect(repository.list()).resolves.toHaveLength(1);
      expect(providerCallCount).toBe(2);
      expect(providerInputs).toEqual([input, input]);
    } finally {
      await close();
    }
  });

  it("rejects an unknown brief before provider execution", async () => {
    const { repository, close } = await createPgliteRepository();
    const generate = vi.fn(async () => validAnalysis);
    const service = new BriefWorkflowService(
      repository,
      { name: "mock", model: "mock-v1", generate },
      100,
    );

    try {
      await expect(service.retry(crypto.randomUUID())).rejects.toBeInstanceOf(
        BriefNotFoundError,
      );
      expect(generate).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it("allows only one provider execution for concurrent retries", async () => {
    const { repository, close } = await createPgliteRepository();
    let providerCallCount = 0;
    let releaseRetry: (() => void) | undefined;
    let markRetryStarted: (() => void) | undefined;
    const retryStarted = new Promise<void>((resolve) => {
      markRetryStarted = resolve;
    });
    const retryGate = new Promise<void>((resolve) => {
      releaseRetry = resolve;
    });
    const provider: AnalysisProvider = {
      name: "mock",
      model: "mock-v1",
      generate: async () => {
        providerCallCount += 1;

        if (providerCallCount === 1) {
          return { recommendation: { decision: "invalid" } };
        }

        markRetryStarted?.();
        await retryGate;
        return validAnalysis;
      },
    };
    const service = new BriefWorkflowService(repository, provider, 100);

    try {
      const failed = await service.create(input);
      const firstRetry = service.retry(failed.id);
      await retryStarted;

      await expect(service.retry(failed.id)).rejects.toBeInstanceOf(
        AnalysisRetryConflictError,
      );
      releaseRetry?.();
      await expect(firstRetry).resolves.toMatchObject({
        analysis: { status: "completed" },
      });
      expect(providerCallCount).toBe(2);
    } finally {
      releaseRetry?.();
      await close();
    }
  });

  it("rejects fresh pending work and reclaims it after the timeout grace period", async () => {
    const { repository, close } = await createPgliteRepository();
    const pending = await repository.createWithPendingAnalysis(input, {
      provider: "mock",
      model: "mock-v1",
      promptVersion: "2026-08-22",
    });
    let now = new Date(pending.analysis!.updatedAt.getTime() + 5_500);
    const generate = vi.fn(async () => validAnalysis);
    const service = new BriefWorkflowService(
      repository,
      { name: "mock", model: "mock-v1", generate },
      1_000,
      () => now,
    );

    try {
      await expect(service.retry(pending.id)).rejects.toBeInstanceOf(
        AnalysisRetryConflictError,
      );
      expect(generate).not.toHaveBeenCalled();

      now = new Date(pending.analysis!.updatedAt.getTime() + 6_001);
      await expect(service.retry(pending.id)).resolves.toMatchObject({
        analysis: { status: "completed" },
      });
      expect(generate).toHaveBeenCalledTimes(1);
    } finally {
      await close();
    }
  });
});
