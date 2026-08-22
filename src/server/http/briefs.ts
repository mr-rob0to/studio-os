import "server-only";

import { z } from "zod";

import { briefInputSchema, type ApiError, type BriefInput } from "@/contracts";
import {
  AnalysisClaimLostError,
  AnalysisRetryConflictError,
  BriefNotFoundError,
} from "@/server/briefs/service";
import {
  createBriefWorkflowRuntimeFromEnvironment,
  type BriefWorkflowRuntime,
} from "@/server/briefs/runtime";

export const MAX_BRIEF_REQUEST_BYTES = 16_384;

interface RequestLogger {
  info(event: string, context: Record<string, unknown>): void;
  warn(event: string, context: Record<string, unknown>): void;
  error(event: string, context: Record<string, unknown>): void;
}

interface HandlerDependencies {
  createRuntime(): Promise<BriefWorkflowRuntime>;
  createRequestId(): string;
  logger: RequestLogger;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const defaultDependencies: HandlerDependencies = {
  createRuntime: createBriefWorkflowRuntimeFromEnvironment,
  createRequestId: () => crypto.randomUUID(),
  logger: console,
};

export async function handleCreateBriefRequest(
  request: Request,
  dependencies: HandlerDependencies = defaultDependencies,
): Promise<Response> {
  const requestId = dependencies.createRequestId();

  try {
    const input = await parseBriefRequest(request);
    const runtime = await dependencies.createRuntime();
    let detail;

    try {
      detail = await runtime.service.create(input);
    } finally {
      await runtime.close();
    }

    dependencies.logger.info("brief_create_completed", {
      requestId,
      status: 201,
      analysisStatus: detail.analysis?.status ?? "missing",
    });
    return jsonResponse(detail, 201, requestId);
  } catch (error) {
    return errorResponse(error, requestId, dependencies.logger);
  }
}

export async function handleRetryAnalysisRequest(
  request: Request,
  briefId: string,
  dependencies: HandlerDependencies = defaultDependencies,
): Promise<Response> {
  const requestId = dependencies.createRequestId();

  try {
    const validatedBriefId = await parseRetryRequest(request, briefId);
    const runtime = await dependencies.createRuntime();
    let detail;

    try {
      detail = await runtime.service.retry(validatedBriefId);
    } finally {
      await runtime.close();
    }

    dependencies.logger.info("brief_retry_completed", {
      requestId,
      status: 200,
      analysisStatus: detail.analysis?.status ?? "missing",
    });
    return jsonResponse(detail, 200, requestId);
  } catch (error) {
    return errorResponse(error, requestId, dependencies.logger);
  }
}

async function parseBriefRequest(request: Request): Promise<BriefInput> {
  const mediaType = request.headers.get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();

  if (mediaType !== "application/json") {
    throw new HttpError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Use application/json for this request.",
    );
  }

  const body = await readBody(request, MAX_BRIEF_REQUEST_BYTES);
  let candidate: unknown;

  try {
    candidate = JSON.parse(body) as unknown;
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Send a valid JSON request body.");
  }

  const parsed = briefInputSchema.safeParse(candidate);

  if (!parsed.success) {
    throw new HttpError(
      422,
      "VALIDATION_ERROR",
      "Check the brief fields and try again.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  return parsed.data;
}

async function parseRetryRequest(request: Request, briefId: string): Promise<string> {
  const parsedId = z.uuid().safeParse(briefId);

  if (!parsedId.success) {
    throw new HttpError(
      422,
      "INVALID_BRIEF_ID",
      "Use a valid brief identifier.",
      { id: ["Use a valid brief identifier."] },
    );
  }

  const body = await readBody(request, MAX_BRIEF_REQUEST_BYTES);

  if (body.length > 0) {
    throw new HttpError(
      400,
      "UNEXPECTED_REQUEST_BODY",
      "Do not send a request body when retrying analysis.",
    );
  }

  return parsedId.data;
}

async function readBody(request: Request, maximumBytes: number): Promise<string> {
  const declaredLength = request.headers.get("content-length");

  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) {
      throw new HttpError(
        400,
        "INVALID_CONTENT_LENGTH",
        "Use a valid Content-Length header.",
      );
    }

    if (Number(declaredLength) > maximumBytes) {
      throw new HttpError(
        413,
        "REQUEST_TOO_LARGE",
        `Keep the request body under ${maximumBytes} bytes.`,
      );
    }
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new HttpError(
        413,
        "REQUEST_TOO_LARGE",
        `Keep the request body under ${maximumBytes} bytes.`,
      );
    }

    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new HttpError(400, "INVALID_BODY_ENCODING", "Use UTF-8 request text.");
  }
}

function errorResponse(
  error: unknown,
  requestId: string,
  logger: RequestLogger,
): Response {
  const mapped = mapError(error);
  const body: ApiError = {
    error: {
      code: mapped.code,
      message: mapped.message,
      requestId,
      ...(mapped.fieldErrors ? { fieldErrors: mapped.fieldErrors } : {}),
    },
  };
  const context = { requestId, status: mapped.status, code: mapped.code };

  if (mapped.status >= 500) {
    logger.error("brief_request_failed", context);
  } else {
    logger.warn("brief_request_rejected", context);
  }

  return jsonResponse(body, mapped.status, requestId);
}

function mapError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof BriefNotFoundError) {
    return new HttpError(404, "BRIEF_NOT_FOUND", "The requested brief was not found.");
  }

  if (error instanceof AnalysisRetryConflictError) {
    if (error.reason === "pending") {
      return new HttpError(
        409,
        "ANALYSIS_IN_PROGRESS",
        "Analysis is already in progress. Try again later.",
      );
    }

    return new HttpError(
      409,
      "ANALYSIS_NOT_RETRYABLE",
      "This analysis cannot be retried.",
    );
  }

  if (error instanceof AnalysisClaimLostError) {
    return new HttpError(
      409,
      "ANALYSIS_CLAIM_LOST",
      "Another request updated this analysis. Refresh and try again.",
    );
  }

  return new HttpError(
    500,
    "INTERNAL_ERROR",
    "The request could not be completed. Try again.",
  );
}

function jsonResponse(body: unknown, status: number, requestId: string): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  });
}
