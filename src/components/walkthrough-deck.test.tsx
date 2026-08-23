import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WalkthroughDeck } from "./walkthrough-deck";

function renderDeck() {
  return render(<WalkthroughDeck />);
}

describe("WalkthroughDeck", () => {
  it("moves forward and backward with the approved keys", () => {
    renderDeck();

    expect(screen.getByRole("heading", { name: "THE PROBLEM" })).toBeVisible();
    expect(fireEvent.keyDown(window, { key: "ArrowRight" })).toBe(false);
    expect(screen.getByRole("heading", { name: "TECH STACK + FLOW" })).toBeVisible();

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByRole("heading", { name: "CURRENT FEATURES" })).toBeVisible();

    fireEvent.keyDown(window, { key: "PageDown" });
    expect(screen.getByRole("heading", { name: "HOW WE USE AI" })).toBeVisible();

    expect(fireEvent.keyDown(window, { key: "ArrowLeft" })).toBe(false);
    expect(screen.getByRole("heading", { name: "CURRENT FEATURES" })).toBeVisible();

    fireEvent.keyDown(window, { key: "PageUp" });
    expect(screen.getByRole("heading", { name: "TECH STACK + FLOW" })).toBeVisible();
  });

  it("jumps to the first and last slides and clamps at each boundary", () => {
    renderDeck();

    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "THE PROBLEM" })).toBeVisible();

    fireEvent.keyDown(window, { key: "End" });
    expect(screen.getByRole("heading", { name: "DEMO" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Previous slide" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next slide" })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "DEMO" })).toBeVisible();

    fireEvent.keyDown(window, { key: "Home" });
    expect(screen.getByRole("heading", { name: "THE PROBLEM" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeEnabled();
  });

  it.each(["altKey", "ctrlKey", "metaKey", "shiftKey"] as const)(
    "does not capture ArrowRight when %s is pressed",
    (modifier) => {
      renderDeck();

      expect(fireEvent.keyDown(window, { key: "ArrowRight", [modifier]: true })).toBe(true);
      expect(screen.getByRole("heading", { name: "THE PROBLEM" })).toBeVisible();
    },
  );

  it("does not capture shortcuts from interactive or editable targets", () => {
    renderDeck();
    const button = document.createElement("button");
    const editable = document.createElement("div");
    const input = document.createElement("input");
    const link = document.createElement("a");
    const select = document.createElement("select");
    const textarea = document.createElement("textarea");
    editable.setAttribute("contenteditable", "true");
    link.href = "#slide";
    const interactiveTargets = [button, editable, input, link, select, textarea];
    document.body.append(...interactiveTargets);

    for (const target of interactiveTargets) {
      expect(fireEvent.keyDown(target, { key: "ArrowRight" })).toBe(true);
    }
    expect(screen.getByRole("heading", { name: "THE PROBLEM" })).toBeVisible();

    for (const target of interactiveTargets) {
      target.remove();
    }
  });

  it("exposes the active slide and its change announcement accessibly", () => {
    renderDeck();

    const slide = screen.getByRole("group", { name: "THE PROBLEM" });
    expect(slide).toHaveAttribute("aria-roledescription", "slide");
    expect(slide).toHaveAttribute("aria-labelledby");
    expect(screen.getByText("Slide 1 of 7: THE PROBLEM")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(screen.getByText("Slide 1 of 7: THE PROBLEM")).toHaveAttribute(
      "aria-atomic",
      "true",
    );
    expect(screen.getByTestId("slide-progress")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the final slide simple while keyboard navigation remains available", () => {
    renderDeck();
    fireEvent.keyDown(window, { key: "End" });

    const slide = screen.getByRole("group", { name: "DEMO" });
    expect(slide).toHaveTextContent(/^DEMO$/);
    expect(screen.getByText("Slide 7 of 7: DEMO")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "PageUp" });
    expect(
      screen.getByRole("heading", { name: "WHAT I WOULD ADD NEXT" }),
    ).toBeVisible();
  });
});
