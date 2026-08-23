import "server-only";

import type { PersistedBrief } from "@/contracts";
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
