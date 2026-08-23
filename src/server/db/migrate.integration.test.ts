// @vitest-environment node

import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { expect, it } from "vitest";

const execFileAsync = promisify(execFile);

it(
  "runs the migration CLI with the explicitly selected local environment",
  async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "studio-os-migrate-test-"));

    try {
      const result = await execFileAsync(
        "pnpm",
        ["db:migrate"],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            APP_ENV: "local",
            DATABASE_URL: "",
            DATABASE_DRIVER: "pglite",
            NODE_OPTIONS: [
              "--conditions=react-server",
              process.env.NODE_OPTIONS,
            ]
              .filter(Boolean)
              .join(" "),
            PGLITE_DATA_DIR: dataDir,
          },
        },
      );

      expect(result.stderr).toBe("");
    } finally {
      await rm(dataDir, { force: true, recursive: true });
    }
  },
  15_000,
);
