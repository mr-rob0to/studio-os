import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  calls: [] as string[],
  connection: vi.fn(async () => {}),
  listBriefs: vi.fn(),
}));

vi.mock("next/server", () => ({
  connection: pageMocks.connection,
}));

vi.mock("@/server/briefs/queries", () => ({
  listBriefsFromEnvironment: pageMocks.listBriefs,
}));

import BriefsPage from "./page";

describe("BriefsPage", () => {
  beforeEach(() => {
    pageMocks.calls.length = 0;
    pageMocks.connection.mockReset();
    pageMocks.listBriefs.mockReset();
    pageMocks.connection.mockImplementation(async () => {
      pageMocks.calls.push("request");
    });
    pageMocks.listBriefs.mockImplementation(async () => {
      pageMocks.calls.push("database");
      return [];
    });
  });

  it("waits for a real request before reading the brief repository", async () => {
    render(await BriefsPage());

    expect(pageMocks.calls).toEqual(["request", "database"]);
    expect(screen.getByRole("heading", { name: "Creative briefs" })).toBeVisible();
    expect(screen.getByText("No briefs yet")).toBeVisible();
  });

  it("renders current repository results and new-brief navigation", async () => {
    pageMocks.listBriefs.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000001",
        title: "A quiet city wakes",
        description:
          "An animated short about a baker discovering that the city is alive before dawn.",
        contentType: "short_film",
        targetAudience: "Families who enjoy gentle imaginative animation.",
        notes: null,
        createdAt: new Date("2026-08-22T12:00:00.000Z"),
        updatedAt: new Date("2026-08-22T12:00:00.000Z"),
      },
    ]);

    render(await BriefsPage());

    expect(screen.getByRole("link", { name: "New brief" })).toHaveAttribute(
      "href",
      "/briefs/new",
    );
    expect(screen.getByRole("link", { name: "A quiet city wakes" })).toHaveAttribute(
      "href",
      "/briefs/00000000-0000-4000-8000-000000000001",
    );
  });
});
