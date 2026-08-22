import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("Next.js server package configuration", () => {
  it("keeps PGlite outside the server bundle so its Node assets load natively", () => {
    expect(nextConfig.serverExternalPackages).toContain("@electric-sql/pglite");
  });
});
