// @vitest-environment node

import { describe, expect, expectTypeOf, it, vi } from "vitest";

import type { BriefInput } from "@/contracts";
import {
  OpenAIAnalysisProvider,
  type OpenAIResponsesClient,
} from "@/server/analysis/openai";
import type { AnalysisProvider } from "@/server/analysis/provider";

const brief: BriefInput = {
  title: "A quiet city wakes",
  description:
    "An animated short about a night-shift baker discovering that the city is alive before dawn.",
  contentType: "short_film",
  targetAudience: "Families who enjoy gentle, imaginative animation.",
  notes: "Keep the story under eight minutes.",
};

describe("OpenAI analysis provider", () => {
  it("requests non-stored structured output and returns it as unknown", async () => {
    const create = vi.fn(async () => ({
      status: "completed" as const,
      output: [],
      output_text: '{"recommendation":{}}',
      error: null,
      incomplete_details: null,
    }));
    const client: OpenAIResponsesClient = { create };
    const provider = new OpenAIAnalysisProvider(
      "server-only-test-key",
      "gpt-4o-mini",
      client,
    );
    const signal = new AbortController().signal;

    await expect(provider.generate(brief, signal)).resolves.toBe(
      '{"recommendation":{}}',
    );

    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        store: false,
        text: {
          format: expect.objectContaining({
            type: "json_schema",
            strict: true,
          }),
        },
      }),
      { signal },
    );
    expectTypeOf(provider).toMatchTypeOf<AnalysisProvider>();
  });

  it("maps a refusal to the typed provider boundary", async () => {
    const client = {
      create: vi.fn(async () =>
        ({
          status: "completed",
          output: [
            {
              type: "message",
              content: [{ type: "refusal", refusal: "Cannot comply" }],
            },
          ],
          output_text: "",
          error: null,
          incomplete_details: null,
        }) as Awaited<ReturnType<OpenAIResponsesClient["create"]>>,
      ),
    };
    const provider = new OpenAIAnalysisProvider("test-key", "gpt-4o-mini", client);

    await expect(
      provider.generate(brief, new AbortController().signal),
    ).rejects.toMatchObject({ code: "refusal" });
  });

  it("maps incomplete and thrown responses without exposing raw failures", async () => {
    const incompleteClient: OpenAIResponsesClient = {
      create: vi.fn(async () => ({
        status: "incomplete" as const,
        output: [],
        output_text: "",
        error: null,
        incomplete_details: { reason: "max_output_tokens" as const },
      })),
    };
    const failedClient: OpenAIResponsesClient = {
      create: vi.fn(async () => {
        throw new Error("raw upstream failure");
      }),
    };

    await expect(
      new OpenAIAnalysisProvider("test-key", "gpt-4o-mini", incompleteClient).generate(
        brief,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "provider_failure" });
    await expect(
      new OpenAIAnalysisProvider("test-key", "gpt-4o-mini", failedClient).generate(
        brief,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({
      code: "provider_failure",
      message: "provider_failure",
    });
  });
});
