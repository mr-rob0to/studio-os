import "server-only";

import {
  createAnalysisRuntimeFromEnvironment,
  type AnalysisEnvironment,
  type AnalysisRuntime,
} from "@/server/analysis/environment";
import {
  createRepositoryFromEnvironment,
  type DatabaseRepositoryHandle,
} from "@/server/db/connection";

import { BriefWorkflowService } from "./service";

type WorkflowEnvironment = AnalysisEnvironment;

export interface BriefWorkflowRuntime {
  service: BriefWorkflowService;
  close(): Promise<void>;
}

export interface BriefWorkflowRuntimeFactories {
  createRepository(
    environment: WorkflowEnvironment,
  ): Promise<DatabaseRepositoryHandle>;
  createAnalysisRuntime(environment: WorkflowEnvironment): Promise<AnalysisRuntime>;
}

const runtimeFactories: BriefWorkflowRuntimeFactories = {
  createRepository: createRepositoryFromEnvironment,
  createAnalysisRuntime: createAnalysisRuntimeFromEnvironment,
};

export async function createBriefWorkflowRuntimeFromEnvironment(
  environment: WorkflowEnvironment = process.env,
  factories: BriefWorkflowRuntimeFactories = runtimeFactories,
): Promise<BriefWorkflowRuntime> {
  const analysisRuntime = await factories.createAnalysisRuntime(environment);
  const database = await factories.createRepository(environment);

  return {
    service: new BriefWorkflowService(
      database.repository,
      analysisRuntime.provider,
      analysisRuntime.timeoutMs,
    ),
    close: database.close,
  };
}
