import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";

import {
  briefAnalysisSchema,
  type BriefInput,
} from "@/contracts";

import {
  AnalysisProviderError,
  type AnalysisProvider,
} from "./provider";
import { buildAnalysisPrompt } from "./prompt";

type AnalysisResponse = Pick<
  Response,
  "status" | "output" | "output_text" | "error" | "incomplete_details"
>;

export interface OpenAIResponsesClient {
  create(
    body: ResponseCreateParamsNonStreaming,
    options: { signal: AbortSignal },
  ): Promise<AnalysisResponse>;
}

export class OpenAIAnalysisProvider implements AnalysisProvider {
  readonly name = "openai" as const;

  private readonly client: OpenAIResponsesClient;

  constructor(
    apiKey: string,
    readonly model: string,
    client?: OpenAIResponsesClient,
  ) {
    this.client = client ?? createOpenAIClient(apiKey);
  }

  async generate(input: BriefInput, signal: AbortSignal): Promise<unknown> {
    const prompt = buildAnalysisPrompt(input);

    try {
      const response = await this.client.create(
        {
          model: this.model,
          instructions: prompt.instructions,
          input: [
            {
              role: "user",
              content: [{ type: "input_text", text: prompt.userContent }],
            },
          ],
          text: {
            format: zodTextFormat(briefAnalysisSchema, "brief_analysis"),
          },
          store: false,
        },
        { signal },
      );

      if (hasRefusal(response)) {
        throw new AnalysisProviderError("refusal");
      }

      if (
        response.status !== "completed" ||
        response.error ||
        response.incomplete_details ||
        response.output_text.trim().length === 0
      ) {
        throw new AnalysisProviderError("provider_failure");
      }

      return response.output_text;
    } catch (error) {
      if (error instanceof AnalysisProviderError) {
        throw error;
      }

      throw new AnalysisProviderError("provider_failure", { cause: error });
    }
  }
}

function createOpenAIClient(apiKey: string): OpenAIResponsesClient {
  const client = new OpenAI({ apiKey, maxRetries: 0 });

  return {
    create: (body, options) => client.responses.create(body, options),
  };
}

function hasRefusal(response: AnalysisResponse): boolean {
  return response.output.some(
    (item) =>
      item.type === "message" &&
      item.content.some((content) => content.type === "refusal"),
  );
}
