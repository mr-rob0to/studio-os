import "server-only";

import {
  parseApplicationEnvironment,
  type ApplicationEnvironment,
} from "@/server/config";

import type { BriefRepository } from "./repository";
import type { PgliteRepositoryHandle } from "./pglite";

export interface DatabaseRepositoryHandle {
  repository: BriefRepository;
  close(): Promise<void>;
}

export interface DatabaseAdapterFactories {
  createNeonRepository(databaseUrl: string): BriefRepository | Promise<BriefRepository>;
  createPgliteRepository(dataDir?: string): Promise<PgliteRepositoryHandle>;
}

const adapterFactories: DatabaseAdapterFactories = {
  async createNeonRepository(databaseUrl) {
    const { createNeonRepository } = await import("./neon");
    return createNeonRepository(databaseUrl);
  },
  async createPgliteRepository(dataDir) {
    const { createPgliteRepository } = await import("./pglite");
    return createPgliteRepository(dataDir);
  },
};

export async function createRepositoryFromEnvironment(
  environment: ApplicationEnvironment = process.env,
  factories: DatabaseAdapterFactories = adapterFactories,
): Promise<DatabaseRepositoryHandle> {
  const configuration = parseApplicationEnvironment(environment);

  if (configuration.database.driver === "neon") {
    return {
      repository: await factories.createNeonRepository(
        configuration.database.databaseUrl,
      ),
      close: async () => {},
    };
  }

  return factories.createPgliteRepository(configuration.database.dataDir);
}
