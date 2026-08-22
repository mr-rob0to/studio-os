// @vitest-environment node

import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { briefAnalysisSchema, type BriefInput } from "@/contracts";
import { MockAnalysisProvider } from "@/server/analysis/mock";
import type { AnalysisProvider } from "@/server/analysis/provider";
import { analyzeBrief } from "@/server/analysis/service";

const brief: BriefInput = {
  title: "A quiet city wakes",
  description:
    "An animated short about a night-shift baker discovering that the city is alive before dawn.",
  contentType: "short_film",
  targetAudience: "Families who enjoy gentle, imaginative animation.",
  notes: null,
};

describe("mock analysis provider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns deterministic output that satisfies the shared contract", async () => {
    const provider = new MockAnalysisProvider("success");

    const first = await provider.generate(brief, new AbortController().signal);
    const second = await provider.generate(brief, new AbortController().signal);

    expect(first).toEqual(second);
    expect(briefAnalysisSchema.safeParse(first).success).toBe(true);
    expectTypeOf(provider).toMatchTypeOf<AnalysisProvider>();
  });

  it("stays within the shared contract for maximum-length valid brief fields", async () => {
    const output = await new MockAnalysisProvider("success").generate(
      { ...brief, title: "T".repeat(120), targetAudience: "A".repeat(500) },
      new AbortController().signal,
    );

    expect(briefAnalysisSchema.safeParse(output).success).toBe(true);
  });

  it("exposes deterministic malformed and timeout modes for local verification", async () => {
    const malformed = await new MockAnalysisProvider("malformed").generate(
      brief,
      new AbortController().signal,
    );
    expect(briefAnalysisSchema.safeParse(malformed).success).toBe(false);

    vi.useFakeTimers();
    const timeoutOutcome = analyzeBrief(
      brief,
      new MockAnalysisProvider("timeout"),
      25,
    );
    await vi.advanceTimersByTimeAsync(25);

    await expect(timeoutOutcome).resolves.toMatchObject({
      status: "failed",
      result: null,
      failureCode: "MODEL_TIMEOUT",
    });
  });
});
