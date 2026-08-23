import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BriefDetail } from "@/contracts";

import { BriefAnalysisPanel } from "./brief-analysis";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const completedDetail: BriefDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "A quiet city wakes",
  description:
    "An animated short about a baker discovering that the city is alive before dawn.",
  contentType: "short_film",
  targetAudience: "Families who enjoy gentle imaginative animation.",
  notes: "Keep the opening visually calm.",
  createdAt: new Date("2026-08-22T12:00:00.000Z"),
  updatedAt: new Date("2026-08-22T12:00:00.000Z"),
  analysis: {
    id: "00000000-0000-4000-8000-000000000002",
    briefId: "00000000-0000-4000-8000-000000000001",
    status: "completed",
    result: {
      recommendation: {
        decision: "needs_discussion",
        rationale:
          "The premise is clear, but the team should align on the intended emotional outcome.",
      },
      themes: ["Community", "Hidden wonder"],
      classification: {
        format: "Animated short",
        tone: ["Gentle", "Imaginative"],
        genreSignals: ["Magical realism"],
      },
      audience: {
        interpretation: "Families looking for a calm story with a sense of discovery.",
        audienceNeeds: ["A clear emotional through-line"],
        accessibilityConsiderations: [
          "Keep essential story information understandable without dialogue",
        ],
      },
      strengths: ["The premise establishes a distinct time and place"],
      opportunities: ["Tie the city reveal to the baker's central choice"],
      risksAndAmbiguities: ["The desired audience response is not yet explicit"],
      missingInformation: ["Production length"],
      nextActions: [
        {
          action: "Confirm the intended audience response",
          owner: "creative_lead",
          priority: "high",
        },
      ],
    },
    failureCode: null,
    failureMessage: null,
    provider: "openai",
    model: "secret-model-name",
    promptVersion: "analysis-v2",
    createdAt: new Date("2026-08-22T12:00:00.000Z"),
    updatedAt: new Date("2026-08-22T12:00:01.000Z"),
  },
};

describe("BriefAnalysisPanel", () => {
  it("renders completed analysis as a decision-oriented structured review", () => {
    render(<BriefAnalysisPanel detail={completedDetail} />);

    const recommendation = screen.getByRole("region", {
      name: "Analysis recommendation",
    });
    expect(within(recommendation).getByText("Needs discussion")).toBeVisible();
    expect(within(recommendation).getByText(/premise is clear/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Strengths" })).toBeVisible();
    expect(screen.getByText("Community")).toBeVisible();
    expect(screen.getByText("Confirm the intended audience response")).toBeVisible();
    const ownerLabel = screen.getByText("Owner", { selector: "dt" });
    expect(ownerLabel).toBeVisible();
    expect(ownerLabel.nextElementSibling).toHaveTextContent("Creative lead");
    expect(screen.queryByText("secret-model-name")).not.toBeInTheDocument();
    expect(screen.queryByText("openai")).not.toBeInTheDocument();
  });

  it("renders a failed analysis as a safe, actionable retry state", () => {
    const failedDetail: BriefDetail = {
      ...completedDetail,
      analysis: {
        ...completedDetail.analysis!,
        status: "failed",
        result: null,
        failureCode: "PROVIDER_SECRET_CODE",
        failureMessage: "Provider traceback with secret-model-token",
      },
    };

    render(<BriefAnalysisPanel detail={failedDetail} />);

    expect(
      screen.getByRole("heading", { name: "Analysis needs attention" }),
    ).toBeVisible();
    expect(screen.getByText(/brief is saved/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry analysis" })).toBeEnabled();
    expect(screen.queryByText(/secret-model-token/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PROVIDER_SECRET_CODE/)).not.toBeInTheDocument();
  });

  it("renders pending analysis with safe stale-recovery guidance", () => {
    const pendingDetail: BriefDetail = {
      ...completedDetail,
      analysis: {
        ...completedDetail.analysis!,
        status: "pending",
        result: null,
      },
    };

    render(<BriefAnalysisPanel detail={pendingDetail} />);

    expect(
      screen.getByRole("heading", { name: "Analysis in progress" }),
    ).toBeVisible();
    expect(screen.getByText(/safely recover it/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry analysis" })).toBeEnabled();
  });
});
