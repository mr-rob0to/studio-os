import "server-only";

import {
  briefInputSchema,
  type BriefDetail,
  type BriefInput,
} from "@/contracts";
import type { AnalysisProvider } from "@/server/analysis/provider";
import { PROMPT_VERSION } from "@/server/analysis/prompt";
import { analyzeBrief } from "@/server/analysis/service";
import type {
  AnalysisAttemptMetadata,
  AnalysisRetryClaim,
  BriefRepository,
  BriefWithAnalysis,
} from "@/server/db/repository";

const STALE_PENDING_GRACE_MS = 5_000;

export class BriefNotFoundError extends Error {
  constructor() {
    super("brief_not_found");
    this.name = "BriefNotFoundError";
  }
}

export class AnalysisRetryConflictError extends Error {
  constructor(
    readonly reason: "pending" | "completed" | "missing_analysis",
  ) {
    super(`analysis_retry_${reason}`);
    this.name = "AnalysisRetryConflictError";
  }
}

export class AnalysisClaimLostError extends Error {
  constructor() {
    super("analysis_claim_lost");
    this.name = "AnalysisClaimLostError";
  }
}

export class BriefWorkflowService {
  constructor(
    private readonly repository: BriefRepository,
    private readonly provider: AnalysisProvider,
    private readonly timeoutMs: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(input: BriefInput): Promise<BriefDetail> {
    const pending = await this.repository.createWithPendingAnalysis(
      input,
      this.attemptMetadata(),
    );
    const pendingWithAnalysis = requireAnalysis(pending);
    const outcome = await analyzeBrief(input, this.provider, this.timeoutMs);
    const saved = await this.repository.saveAnalysisOutcome(
      pendingWithAnalysis.analysis.id,
      pendingWithAnalysis.analysis.updatedAt,
      outcome,
    );

    if (!saved) {
      throw new AnalysisClaimLostError();
    }

    return saved;
  }

  async retry(briefId: string): Promise<BriefDetail> {
    const staleBefore = new Date(
      this.now().getTime() - this.timeoutMs - STALE_PENDING_GRACE_MS,
    );
    const claim = await this.repository.claimAnalysisRetry(
      briefId,
      staleBefore,
      this.attemptMetadata(),
    );
    const detail = requireRetryClaim(claim);
    const input = briefInputSchema.parse(detail);
    const outcome = await analyzeBrief(input, this.provider, this.timeoutMs);
    const saved = await this.repository.saveAnalysisOutcome(
      detail.analysis.id,
      detail.analysis.updatedAt,
      outcome,
    );

    if (!saved) {
      throw new AnalysisClaimLostError();
    }

    return saved;
  }

  private attemptMetadata(): AnalysisAttemptMetadata {
    return {
      provider: this.provider.name,
      model: this.provider.model,
      promptVersion: PROMPT_VERSION,
    };
  }
}

function requireAnalysis(detail: BriefDetail): BriefWithAnalysis {
  if (!detail.analysis) {
    throw new AnalysisClaimLostError();
  }

  return { ...detail, analysis: detail.analysis };
}

function requireRetryClaim(claim: AnalysisRetryClaim): BriefWithAnalysis {
  if (claim.status === "not_found") {
    throw new BriefNotFoundError();
  }

  if (claim.status === "conflict") {
    throw new AnalysisRetryConflictError(claim.reason);
  }

  return claim.detail;
}
