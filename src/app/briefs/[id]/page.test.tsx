import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  calls: [] as string[],
  connection: vi.fn(async () => {}),
  findDetail: vi.fn(),
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/server", () => ({
  connection: pageMocks.connection,
}));

vi.mock("next/navigation", () => ({
  notFound: pageMocks.notFound,
}));

vi.mock("@/server/briefs/queries", () => ({
  findBriefDetailFromEnvironment: pageMocks.findDetail,
}));

vi.mock("@/components/brief-analysis", () => ({
  BriefAnalysisPanel: ({ detail }: { detail: { title: string } }) => (
    <section aria-label="Rendered analysis">Analysis for {detail.title}</section>
  ),
}));

import BriefDetailPage from "./page";

const briefId = "00000000-0000-4000-8000-000000000001";
const detail = {
  id: briefId,
  title: "A quiet city wakes",
  description:
    "An animated short about a baker discovering that the city is alive before dawn.",
  contentType: "short_film" as const,
  targetAudience: "Families who enjoy gentle imaginative animation.",
  notes: "Keep the opening visually calm.",
  createdAt: new Date("2026-08-22T12:00:00.000Z"),
  updatedAt: new Date("2026-08-22T12:00:00.000Z"),
  analysis: null,
};

describe("BriefDetailPage", () => {
  beforeEach(() => {
    pageMocks.calls.length = 0;
    pageMocks.connection.mockReset();
    pageMocks.findDetail.mockReset();
    pageMocks.notFound.mockClear();
    pageMocks.connection.mockImplementation(async () => {
      pageMocks.calls.push("request");
    });
    pageMocks.findDetail.mockImplementation(async () => {
      pageMocks.calls.push("database");
      return detail;
    });
  });

  it("renders the saved brief and direct server-side analysis read", async () => {
    render(await BriefDetailPage({ params: Promise.resolve({ id: briefId }) }));

    expect(pageMocks.calls).toEqual(["request", "database"]);
    expect(pageMocks.findDetail).toHaveBeenCalledWith(briefId);
    expect(screen.getByRole("heading", { level: 1, name: detail.title })).toBeVisible();
    expect(screen.getByText(detail.description)).toBeVisible();
    expect(screen.getByText(detail.targetAudience)).toBeVisible();
    expect(screen.getByText(detail.notes)).toBeVisible();
    expect(screen.getByText("Short film")).toBeVisible();
    expect(screen.getByRole("region", { name: "Rendered analysis" })).toBeVisible();
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByRole("link", { name: "Briefs" })).toHaveAttribute(
      "href",
      "/briefs",
    );
  });

  it("renders not found for invalid or missing brief identifiers", async () => {
    await expect(
      BriefDetailPage({ params: Promise.resolve({ id: "not-a-uuid" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(pageMocks.findDetail).not.toHaveBeenCalled();

    pageMocks.findDetail.mockResolvedValue(null);
    await expect(
      BriefDetailPage({ params: Promise.resolve({ id: briefId }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(pageMocks.notFound).toHaveBeenCalledTimes(2);
  });
});
