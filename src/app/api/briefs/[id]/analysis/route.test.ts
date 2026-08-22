// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AnalysisRetryConflictError,
  BriefNotFoundError,
} from "@/server/briefs/service";

const runtimeMocks = vi.hoisted(() => ({
  createRuntime: vi.fn(),
}));

vi.mock("@/server/briefs/runtime", () => ({
  createBriefWorkflowRuntimeFromEnvironment: runtimeMocks.createRuntime,
}));

import { POST } from "./route";

const briefId = "00000000-0000-4000-8000-000000000001";
const failedDetail = {
  id: briefId,
  title: "A quiet city wakes",
  description:
    "An animated short about a baker discovering that the city is alive before dawn.",
  contentType: "short_film",
  targetAudience: "Families who enjoy gentle imaginative animation.",
  notes: null,
  createdAt: new Date("2026-08-22T12:00:00.000Z"),
  updatedAt: new Date("2026-08-22T12:00:00.000Z"),
  analysis: {
    id: "00000000-0000-4000-8000-000000000002",
    briefId,
    status: "failed",
    result: null,
    failureCode: "MODEL_PROVIDER_ERROR",
    failureMessage: "Analysis is temporarily unavailable. Try again.",
    provider: "mock",
    model: "mock-v1",
    promptVersion: "2026-08-22",
    createdAt: new Date("2026-08-22T12:00:00.000Z"),
    updatedAt: new Date("2026-08-22T12:00:01.000Z"),
  },
};

const callPost = (id: string, body?: string) =>
  POST(
    new Request(`http://localhost/api/briefs/${id}/analysis`, {
      method: "POST",
      ...(body === undefined ? {} : { body }),
    }),
    { params: Promise.resolve({ id }) },
  );

describe("POST /api/briefs/[id]/analysis", () => {
  beforeEach(() => {
    runtimeMocks.createRuntime.mockReset();
  });

  it("rejects an invalid brief ID and nonempty body before side effects", async () => {
    const invalidId = await callPost("not-a-uuid");
    const unexpectedBody = await callPost(briefId, "{}");

    expect(invalidId.status).toBe(422);
    await expect(invalidId.json()).resolves.toMatchObject({
      error: { code: "INVALID_BRIEF_ID", fieldErrors: { id: expect.any(Array) } },
    });
    expect(unexpectedBody.status).toBe(400);
    await expect(unexpectedBody.json()).resolves.toMatchObject({
      error: { code: "UNEXPECTED_REQUEST_BODY" },
    });
    expect(runtimeMocks.createRuntime).not.toHaveBeenCalled();
  });

  it("returns the persisted retry result and always closes the runtime", async () => {
    const retry = vi.fn(async () => failedDetail);
    const close = vi.fn(async () => {});
    runtimeMocks.createRuntime.mockResolvedValue({ service: { retry }, close });

    const response = await callPost(briefId);

    expect(response.status).toBe(200);
    expect(retry).toHaveBeenCalledWith(briefId);
    expect(close).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      id: briefId,
      analysis: {
        status: "failed",
        result: null,
        failureCode: "MODEL_PROVIDER_ERROR",
      },
    });
  });

  it.each([
    {
      name: "unknown brief",
      error: new BriefNotFoundError(),
      status: 404,
      code: "BRIEF_NOT_FOUND",
    },
    {
      name: "active retry",
      error: new AnalysisRetryConflictError("pending"),
      status: 409,
      code: "ANALYSIS_IN_PROGRESS",
    },
    {
      name: "completed analysis",
      error: new AnalysisRetryConflictError("completed"),
      status: 409,
      code: "ANALYSIS_NOT_RETRYABLE",
    },
  ])("maps $name to a safe error envelope", async ({ error, status, code }) => {
    runtimeMocks.createRuntime.mockResolvedValue({
      service: {
        retry: vi.fn(async () => {
          throw error;
        }),
      },
      close: vi.fn(async () => {}),
    });

    const response = await callPost(briefId);
    const body = await response.json();

    expect(response.status).toBe(status);
    expect(body).toMatchObject({
      error: { code, requestId: response.headers.get("x-request-id") },
    });
  });
});
