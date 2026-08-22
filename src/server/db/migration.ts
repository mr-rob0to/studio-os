import "server-only";

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  parseApplicationEnvironment,
  type ApplicationEnvironment,
} from "@/server/config";

export interface MigrationFactories {
  migratePglite(dataDir: string): Promise<void>;
  migrateNeon(databaseUrl: string): Promise<void>;
}

const migrationFactories: MigrationFactories = {
  async migratePglite(dataDir) {
    const [{ PGlite }, { drizzle }, { migrate }, schema] = await Promise.all([
      import("@electric-sql/pglite"),
      import("drizzle-orm/pglite"),
      import("drizzle-orm/pglite/migrator"),
      import("./schema"),
    ]);
    await mkdir(dirname(dataDir), { recursive: true });
    const client = new PGlite(dataDir);

    try {
      await migrate(drizzle({ client, schema }), {
        migrationsFolder: resolve(process.cwd(), "drizzle"),
      });
    } finally {
      await client.close();
    }
  },
  async migrateNeon(databaseUrl) {
    const [{ neon }, { drizzle }, { migrate }, schema] = await Promise.all([
      import("@neondatabase/serverless"),
      import("drizzle-orm/neon-http"),
      import("drizzle-orm/neon-http/migrator"),
      import("./schema"),
    ]);
    const database = drizzle({ client: neon(databaseUrl), schema });

    await migrate(database, {
      migrationsFolder: resolve(process.cwd(), "drizzle"),
    });
  },
};

export async function runMigrationsFromEnvironment(
  environment: ApplicationEnvironment = process.env,
  factories: MigrationFactories = migrationFactories,
): Promise<void> {
  const configuration = parseApplicationEnvironment(environment);

  if (configuration.database.driver === "pglite") {
    await factories.migratePglite(
      configuration.database.dataDir ?? ".pglite/studio-os",
    );
    return;
  }

  await factories.migrateNeon(configuration.database.databaseUrl);
}
