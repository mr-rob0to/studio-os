import "server-only";

import type { BriefRepository } from "./repository";
import type { PgliteRepositoryHandle } from "./pglite";

type DatabaseEnvironment = Record<string, string | undefined>;

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
  environment: DatabaseEnvironment = process.env,
  factories: DatabaseAdapterFactories = adapterFactories,
): Promise<DatabaseRepositoryHandle> {
  const driver = environment.DATABASE_DRIVER ?? "pglite";
  const isVercelDeployment =
    environment.VERCEL_ENV === "preview" || environment.VERCEL_ENV === "production";

  if (isVercelDeployment && driver !== "neon") {
    throw new Error("DATABASE_DRIVER must be neon in Vercel preview and production.");
  }

  if (driver === "neon") {
    const databaseUrl = environment.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required when DATABASE_DRIVER=neon.");
    }

    return {
      repository: await factories.createNeonRepository(databaseUrl),
      close: async () => {},
    };
  }

  if (driver === "pglite") {
    return factories.createPgliteRepository(environment.PGLITE_DATA_DIR);
  }

  throw new Error("DATABASE_DRIVER must be either pglite or neon.");
}
