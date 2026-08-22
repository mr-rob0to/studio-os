import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PersistedBrief } from "@/contracts";

import { BriefList } from "./brief-list";

const briefs: PersistedBrief[] = [
  {
    id: "00000000-0000-4000-8000-000000000002",
    title: "A quiet city wakes",
    description:
      "An animated short about a baker discovering that the city is alive before dawn.",
    contentType: "short_film",
    targetAudience: "Families who enjoy gentle imaginative animation.",
    notes: null,
    createdAt: new Date("2026-08-22T12:00:00.000Z"),
    updatedAt: new Date("2026-08-22T12:00:00.000Z"),
  },
  {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Orbiting home",
    description:
      "A feature about a young engineer rebuilding a family spacecraft in orbit.",
    contentType: "feature",
    targetAudience: "Teens and adults who enjoy hopeful science fiction.",
    notes: null,
    createdAt: new Date("2026-08-21T12:00:00.000Z"),
    updatedAt: new Date("2026-08-21T12:00:00.000Z"),
  },
];

describe("BriefList", () => {
  it("shows a clear empty state with a path to create the first brief", () => {
    render(<BriefList briefs={[]} />);

    expect(screen.getByText("No briefs yet")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Create the first brief" }),
    ).toHaveAttribute("href", "/briefs/new");
  });

  it("renders submitted briefs with navigation to their detail URLs", () => {
    render(<BriefList briefs={briefs} />);

    expect(screen.getByRole("list", { name: "Submitted briefs" })).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("2 briefs")).toBeVisible();
    expect(screen.getByRole("link", { name: "A quiet city wakes" })).toHaveAttribute(
      "href",
      `/briefs/${briefs[0].id}`,
    );
    expect(screen.getByText("Short film")).toBeVisible();
    expect(screen.getByText("Aug 22, 2026")).toBeVisible();
    expect(screen.getByRole("link", { name: "Orbiting home" })).toHaveAttribute(
      "href",
      `/briefs/${briefs[1].id}`,
    );
  });
});
