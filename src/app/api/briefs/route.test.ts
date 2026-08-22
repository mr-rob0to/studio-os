// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeMocks = vi.hoisted(() => ({
  createRuntime: vi.fn(),
}));

vi.mock("@/server/briefs/runtime", () => ({
  createBriefWorkflowRuntimeFromEnvironment: runtimeMocks.createRuntime,
}));

import { POST } from "./route";

const validInput = {
  title: "A quiet city wakes",
  description:
    "An animated short about a baker discovering that the city is alive before dawn.",
  contentType: "short_film",
  targetAudience: "Families who enjoy gentle imaginative animation.",
  notes: null,
};

const completedDetail = {
  ...validInput,
  id: "00000000-0000-4000-8000-000000000001",
  createdAt: new Date("2026-08-22T12:00:00.000Z"),
  updatedAt: new Date("2026-08-22T12:00:00.000Z"),
  analysis: {
    id: "00000000-0000-4000-8000-000000000002",
    briefId: "00000000-0000-4000-8000-000000000001",
    status: "completed",
    result: { recommendation: { decision: "ready_for_development" } },
    failureCode: null,
    failureMessage: null,
    provider: "mock",
    model: "mock-v1",
    promptVersion: "2026-08-22",
    createdAt: new Date("2026-08-22T12:00:00.000Z"),
    updatedAt: new Date("2026-08-22T12:00:01.000Z"),
  },
};

describe("POST /api/briefs", () => {
  beforeEach(() => {
    runtimeMocks.createRuntime.mockReset();
  });

  it("rejects a missing or unsupported JSON media type before side effects", async () => {
    for (const headers of [
      new Headers(),
      new Headers({ "content-type": "text/plain" }),
    ]) {
      const response = await POST(
        new Request("http://localhost/api/briefs", {
          method: "POST",
          headers,
          body: JSON.stringify({ title: "Ignored" }),
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(415);
      expect(response.headers.get("x-request-id")).toBe(body.error.requestId);
      expect(body).toMatchObject({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Use application/json for this request.",
          requestId: expect.any(String),
        },
      });
    }

    expect(runtimeMocks.createRuntime).not.toHaveBeenCalled();
  });

  it("rejects declared and actual bodies over the byte limit before side effects", async () => {
    const declared = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "20000",
        },
        body: "{}",
      }),
    );
    const actual = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "x".repeat(16_385),
      }),
    );

    expect(declared.status).toBe(413);
    expect(actual.status).toBe(413);
    await expect(declared.json()).resolves.toMatchObject({
      error: { code: "REQUEST_TOO_LARGE" },
    });
    await expect(actual.json()).resolves.toMatchObject({
      error: { code: "REQUEST_TOO_LARGE" },
    });
    expect(runtimeMocks.createRuntime).not.toHaveBeenCalled();
  });

  it.each([
    { name: "empty JSON", body: "", status: 400, code: "INVALID_JSON" },
    { name: "malformed JSON", body: "{", status: 400, code: "INVALID_JSON" },
    { name: "primitive JSON", body: "true", status: 422, code: "VALIDATION_ERROR" },
    { name: "array JSON", body: "[]", status: 422, code: "VALIDATION_ERROR" },
    {
      name: "invalid brief fields",
      body: JSON.stringify({ ...validInput, title: "x" }),
      status: 422,
      code: "VALIDATION_ERROR",
    },
  ])("rejects $name before side effects", async ({ body, status, code }) => {
    const response = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ error: { code } });
    expect(runtimeMocks.createRuntime).not.toHaveBeenCalled();
  });

  it("creates and serializes a brief from JSON with a charset", async () => {
    const create = vi.fn(async () => completedDetail);
    const close = vi.fn(async () => {});
    runtimeMocks.createRuntime.mockResolvedValue({ service: { create }, close });

    const response = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ ...validInput, title: `  ${validInput.title}  ` }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(create).toHaveBeenCalledWith(validInput);
    expect(close).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      id: completedDetail.id,
      createdAt: "2026-08-22T12:00:00.000Z",
      analysis: { status: "completed" },
    });
  });

  it("returns a recorded provider failure as failed analysis, never completed output", async () => {
    const failedDetail = {
      ...completedDetail,
      analysis: {
        ...completedDetail.analysis,
        status: "failed",
        result: null,
        failureCode: "MODEL_PROVIDER_ERROR",
        failureMessage: "Analysis is temporarily unavailable. Try again.",
      },
    };
    runtimeMocks.createRuntime.mockResolvedValue({
      service: { create: vi.fn(async () => failedDetail) },
      close: vi.fn(async () => {}),
    });

    const response = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validInput),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      analysis: {
        status: "failed",
        result: null,
        failureCode: "MODEL_PROVIDER_ERROR",
      },
    });
  });

  it("maps unexpected failures to a safe envelope and closes the runtime", async () => {
    const close = vi.fn(async () => {});
    runtimeMocks.createRuntime.mockResolvedValue({
      service: {
        create: vi.fn(async () => {
          throw new Error("postgresql://secret-user:secret-pass@example.invalid");
        }),
      },
      close,
    });

    const response = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validInput),
      }),
    );
    const rawBody = await response.text();

    expect(response.status).toBe(500);
    expect(close).toHaveBeenCalledTimes(1);
    expect(rawBody).not.toContain("secret-user");
    expect(JSON.parse(rawBody)).toMatchObject({
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed. Try again.",
        requestId: response.headers.get("x-request-id"),
      },
    });
  });
});
