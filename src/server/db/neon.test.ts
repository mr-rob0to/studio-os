// @vitest-environment node

import { expectTypeOf, test } from "vitest";

import type { BriefRepository } from "@/server/db/repository";
import { createNeonRepository } from "@/server/db/neon";
import type { PgliteRepositoryHandle } from "@/server/db/pglite";

test("the Neon adapter fulfills the brief repository contract", () => {
  expectTypeOf(createNeonRepository).returns.toMatchTypeOf<BriefRepository>();
  expectTypeOf<PgliteRepositoryHandle["repository"]>().toMatchTypeOf<BriefRepository>();
});
