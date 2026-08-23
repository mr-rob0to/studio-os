import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import NewBriefPage from "./page";

describe("NewBriefPage", () => {
  it("places brief context in a compact breadcrumb above the form", () => {
    render(<NewBriefPage />);

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });

    expect(breadcrumb).toBeVisible();
    expect(within(breadcrumb).getByRole("link", { name: "Briefs" })).toHaveAttribute(
      "href",
      "/briefs",
    );
    expect(within(breadcrumb).getByText("New brief")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Create a creative brief" }),
    ).toBeVisible();
    expect(
      screen.getByText(/Give the team enough direction/),
    ).toBeVisible();
    expect(screen.getByRole("form", { name: "New creative brief" })).toBeVisible();
  });
});
