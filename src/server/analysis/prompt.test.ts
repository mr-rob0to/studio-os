// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { BriefInput } from "@/contracts";
import {
  ANALYSIS_INSTRUCTIONS,
  buildAnalysisPrompt,
  PROMPT_VERSION,
} from "@/server/analysis/prompt";

const brief: BriefInput = {
  title: "A quiet city wakes",
  description:
    "An animated short about a night-shift baker discovering that the city is alive before dawn.",
  contentType: "short_film",
  targetAudience: "Families who enjoy gentle, imaginative animation.",
  notes: "Keep the story under eight minutes.",
};

describe("analysis prompt", () => {
  it("keeps stable instructions separate from all delimited brief fields", () => {
    const prompt = buildAnalysisPrompt(brief);

    expect(PROMPT_VERSION).toBe("analysis-v1");
    expect(prompt.instructions).toBe(ANALYSIS_INSTRUCTIONS);
    expect(prompt.instructions).not.toContain(brief.title);
    expect(prompt.userContent).toMatch(
      /^<brief_data version="analysis-v1">\n[\s\S]+\n<\/brief_data>$/,
    );
    expect(prompt.userContent).toContain(JSON.stringify(brief.title));
    expect(prompt.userContent).toContain(JSON.stringify(brief.description));
    expect(prompt.userContent).toContain(JSON.stringify(brief.contentType));
    expect(prompt.userContent).toContain(JSON.stringify(brief.targetAudience));
    expect(prompt.userContent).toContain(JSON.stringify(brief.notes));
  });

});
