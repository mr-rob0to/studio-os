import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import NewBriefPage from "./page";

describe("NewBriefPage", () => {
  it("renders the accessible submission page and a path back to the list", () => {
    render(<NewBriefPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Create a creative brief" }),
    ).toBeVisible();
    expect(screen.getByRole("form", { name: "New creative brief" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to briefs" })).toHaveAttribute(
      "href",
      "/briefs",
    );
  });
});
