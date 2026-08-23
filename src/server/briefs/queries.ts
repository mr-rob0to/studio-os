import "server-only";

import type { BriefDetail, PersistedBrief } from "@/contracts";
import type { ApplicationEnvironment } from "@/server/config";
import { createRepositoryFromEnvironment } from "@/server/db/connection";
import type { BriefRepository } from "@/server/db/repository";

type BriefListRepository = Pick<BriefRepository, "list">;

interface BriefListRepositoryHandle {
  repository: BriefListRepository;
  close(): Promise<void>;
}

type BriefListRepositoryFactory = (
  environment: ApplicationEnvironment,
) => Promise<BriefListRepositoryHandle>;

type BriefDetailRepository = Pick<BriefRepository, "findDetailById">;

interface BriefDetailRepositoryHandle {
  repository: BriefDetailRepository;
  close(): Promise<void>;
}

type BriefDetailRepositoryFactory = (
  environment: ApplicationEnvironment,
) => Promise<BriefDetailRepositoryHandle>;

export function listBriefs(
  repository: BriefListRepository,
): Promise<PersistedBrief[]> {
  return repository.list();
}

export async function listBriefsFromEnvironment(
  environment: ApplicationEnvironment = process.env,
  createRepository: BriefListRepositoryFactory = createRepositoryFromEnvironment,
): Promise<PersistedBrief[]> {
  const handle = await createRepository(environment);

  try {
    return await listBriefs(handle.repository);
  } finally {
    await handle.close();
  }
}

export function findBriefDetail(
  repository: BriefDetailRepository,
  briefId: string,
): Promise<BriefDetail | null> {
  return repository.findDetailById(briefId);
}

export async function findBriefDetailFromEnvironment(
  briefId: string,
  environment: ApplicationEnvironment = process.env,
  createRepository: BriefDetailRepositoryFactory = createRepositoryFromEnvironment,
): Promise<BriefDetail | null> {
  const handle = await createRepository(environment);

  try {
    return await findBriefDetail(handle.repository, briefId);
  } finally {
    await handle.close();
  }
}
