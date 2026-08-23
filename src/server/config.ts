import "server-only";

import { z } from "zod";

const optionalDatabaseUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).optional(),
);

const applicationEnvironmentSchema = z.object({
  APP_ENV: z.enum(["local", "test", "preview", "production"]),
  DATABASE_DRIVER: z.enum(["pglite", "neon"]),
  PGLITE_DATA_DIR: z.string().trim().min(1).optional(),
  DATABASE_URL: optionalDatabaseUrl,
}).superRefine((configuration, context) => {
  if (
    configuration.DATABASE_DRIVER === "pglite" &&
    (configuration.APP_ENV === "preview" ||
      configuration.APP_ENV === "production")
  ) {
    context.addIssue({
      code: "custom",
      path: ["DATABASE_DRIVER"],
      message: "PGlite is allowed only when APP_ENV is local or test.",
    });
  }

  if (
    configuration.DATABASE_DRIVER === "neon" &&
    configuration.DATABASE_URL === undefined
  ) {
    context.addIssue({
      code: "custom",
      path: ["DATABASE_URL"],
      message: "DATABASE_URL is required when DATABASE_DRIVER is neon.",
    });
  }
});

export type ApplicationEnvironment = Record<string, string | undefined>;

export type ApplicationConfiguration = {
  appEnvironment: "local" | "test" | "preview" | "production";
  database:
    | { driver: "pglite"; dataDir: string | undefined }
    | { driver: "neon"; databaseUrl: string };
};

export function parseApplicationEnvironment(
  environment: ApplicationEnvironment,
): ApplicationConfiguration {
  const configuration = applicationEnvironmentSchema.parse(environment);

  if (configuration.DATABASE_DRIVER === "pglite") {
    return {
      appEnvironment: configuration.APP_ENV,
      database: {
        driver: "pglite",
        dataDir: configuration.PGLITE_DATA_DIR,
      },
    };
  }

  return {
    appEnvironment: configuration.APP_ENV,
    database: {
      driver: "neon",
      databaseUrl: configuration.DATABASE_URL as string,
    },
  };
}
