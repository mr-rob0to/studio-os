import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalysisRetry } from "./analysis-retry";

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigationMocks.refresh }),
}));

const briefId = "00000000-0000-4000-8000-000000000001";

describe("AnalysisRetry", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    navigationMocks.refresh.mockReset();
  });

  it("allows one stale-recovery request and refreshes the server-rendered detail", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    render(<AnalysisRetry briefId={briefId} />);
    const button = screen.getByRole("button", { name: "Retry analysis" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(`/api/briefs/${briefId}/analysis`, {
      method: "POST",
    });
    expect(screen.getByRole("button", { name: "Retrying…" })).toBeDisabled();

    resolveResponse?.(
      Response.json({ id: briefId, analysis: { status: "completed" } }),
    );
    await waitFor(() => expect(navigationMocks.refresh).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Retrying…" })).toBeDisabled();
  });

  it("maps a concurrent retry conflict to safe guidance and allows a later retry", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          error: {
            code: "ANALYSIS_IN_PROGRESS",
            message: "Provider worker secret-model-token is active",
          },
        },
        { status: 409 },
      ),
    );
    render(<AnalysisRetry briefId={briefId} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry analysis" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Analysis is already in progress. Refresh to see the latest status.",
    );
    expect(screen.queryByText(/secret-model-token/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry analysis" })).toBeEnabled();
  });
});
