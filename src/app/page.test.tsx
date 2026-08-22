import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home", () => {
  it("renders the accessible Studio OS foundation shell", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Give every idea a clear next frame.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Foundation ready")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Brief workflow" })).toBeVisible();
    expect(screen.getByText("Brief")).toBeInTheDocument();
    expect(screen.getByText("Shape")).toBeInTheDocument();
    expect(screen.getByText("Decide")).toBeInTheDocument();
  });
});
