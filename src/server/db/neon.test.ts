// @vitest-environment node

import { expect, expectTypeOf, test, vi } from "vitest";

import type { BriefRepository } from "@/server/db/repository";
import {
  createNeonPendingAnalysisWriter,
  createNeonRepository,
} from "@/server/db/neon";
import type { PgliteRepositoryHandle } from "@/server/db/pglite";

test("the Neon adapter fulfills the brief repository contract", () => {
  expectTypeOf(createNeonRepository).returns.toMatchTypeOf<BriefRepository>();
  expectTypeOf<PgliteRepositoryHandle["repository"]>().toMatchTypeOf<BriefRepository>();
});

test("the Neon adapter writes the brief and pending analysis in one HTTP batch", async () => {
  const briefRow = { id: "brief" };
  const analysisRow = { id: "analysis" };
  const briefQuery = { kind: "brief-query" };
  const analysisQuery = { kind: "analysis-query" };
  const returning = vi
    .fn()
    .mockReturnValueOnce(briefQuery)
    .mockReturnValueOnce(analysisQuery);
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));
  const batch = vi.fn(async () => [[briefRow], [analysisRow]]);
  const writer = createNeonPendingAnalysisWriter({ insert, batch } as never);

  await expect(writer({ id: "brief" } as never, { id: "analysis" } as never))
    .resolves.toEqual({ briefRow, analysisRow });
  expect(batch).toHaveBeenCalledWith([briefQuery, analysisQuery]);
});
