import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const formMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: formMocks.push }),
}));

import { BriefForm } from "./brief-form";

const validValues = {
  title: "A quiet city wakes",
  description:
    "An animated short about a baker discovering that the city is alive before dawn.",
  contentType: "short_film",
  targetAudience: "Families who enjoy gentle imaginative animation.",
  notes: "Keep the opening visually calm.",
};

function fillValidForm() {
  fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
    target: { value: validValues.title },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Brief description" }), {
    target: { value: validValues.description },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Content type" }), {
    target: { value: validValues.contentType },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Target audience" }), {
    target: { value: validValues.targetAudience },
  });
  fireEvent.change(screen.getByRole("textbox", { name: /Notes/ }), {
    target: { value: validValues.notes },
  });
}

describe("BriefForm", () => {
  beforeEach(() => {
    formMocks.push.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders required field errors and focuses the first invalid field", () => {
    render(<BriefForm />);

    fireEvent.submit(screen.getByRole("form", { name: "New creative brief" }));

    const title = screen.getByRole("textbox", { name: "Title" });
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAccessibleDescription("Enter at least 3 characters.");
    expect(title).toHaveFocus();
    expect(
      screen.getByRole("textbox", { name: "Brief description" }),
    ).toHaveAccessibleDescription("Enter at least 20 characters.");
    expect(
      screen.getByRole("combobox", { name: "Content type" }),
    ).toHaveAccessibleDescription("Choose a content type.");
    expect(
      screen.getByRole("textbox", { name: "Target audience" }),
    ).toHaveAccessibleDescription("Enter at least 3 characters.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves entered values and renders field errors returned by the server", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the brief fields and try again.",
            fieldErrors: { title: ["The title is already in use."] },
          },
        },
        { status: 422 },
      ),
    );
    render(<BriefForm />);
    fillValidForm();

    fireEvent.submit(screen.getByRole("form", { name: "New creative brief" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      validValues.title,
    );
    expect(
      screen.getByRole("textbox", { name: "Brief description" }),
    ).toHaveValue(validValues.description);
    expect(screen.getByRole("textbox", { name: /Notes/ })).toHaveValue(
      validValues.notes,
    );
    expect(screen.getByText("The title is already in use.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveFocus();
    expect(formMocks.push).not.toHaveBeenCalled();
  });

  it("preserves work and shows a safe message when submission fails", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message:
              "postgresql://secret-user:secret-pass@database.example.invalid",
          },
        },
        { status: 500 },
      ),
    );
    render(<BriefForm />);
    fillValidForm();

    fireEvent.submit(screen.getByRole("form", { name: "New creative brief" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't submit your brief. Your work is still here. Try again.",
    );
    expect(screen.queryByText(/secret-user/)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      validValues.title,
    );
    expect(screen.getByRole("button", { name: "Submit and analyze" })).toBeEnabled();
    expect(formMocks.push).not.toHaveBeenCalled();
  });

  it("prevents duplicate interactions from creating a second mutation", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    render(<BriefForm />);
    fillValidForm();
    const form = screen.getByRole("form", { name: "New creative brief" });

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Submitting and analyzing…" }),
    ).toBeDisabled();

    resolveResponse?.(
      Response.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "The request could not be completed. Try again.",
          },
        },
        { status: 500 },
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Submit and analyze" })).toBeEnabled(),
    );
  });

  it("navigates a successful submission to its future detail URL", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          id: "00000000-0000-4000-8000-000000000001",
          analysis: { status: "completed", failureMessage: null },
        },
        { status: 201 },
      ),
    );
    render(<BriefForm />);
    fillValidForm();

    fireEvent.submit(screen.getByRole("form", { name: "New creative brief" }));

    await waitFor(() =>
      expect(formMocks.push).toHaveBeenCalledWith(
        "/briefs/00000000-0000-4000-8000-000000000001",
      ),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/briefs",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validValues),
      }),
    );
    expect(screen.getByRole("button", { name: "Brief created" })).toBeDisabled();
  });

  it("keeps a saved brief visible when provider analysis fails", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          id: "00000000-0000-4000-8000-000000000001",
          analysis: {
            status: "failed",
            failureMessage: "Provider traceback with secret-model-token",
          },
        },
        { status: 201 },
      ),
    );
    render(<BriefForm />);
    fillValidForm();

    fireEvent.submit(screen.getByRole("form", { name: "New creative brief" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your brief was saved, but analysis could not finish.",
    );
    expect(
      screen.getByRole("link", { name: "Open saved brief" }),
    ).toHaveAttribute("href", "/briefs/00000000-0000-4000-8000-000000000001");
    expect(screen.queryByText(/secret-model-token/)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      validValues.title,
    );
    expect(screen.getByRole("button", { name: "Brief saved" })).toBeDisabled();
    expect(formMocks.push).not.toHaveBeenCalled();
  });
});
