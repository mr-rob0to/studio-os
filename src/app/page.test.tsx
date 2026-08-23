import { describe, expect, it, vi } from "vitest";

const rootRouteMocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: rootRouteMocks.redirect,
}));

import Home from "./page";

describe("Home", () => {
  it("lands internal-tool users on the brief board", () => {
    expect(() => Home()).toThrow("NEXT_REDIRECT:/briefs");
  });
});
