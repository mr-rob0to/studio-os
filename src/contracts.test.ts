import { describe, expect, it } from "vitest";

import { briefInputSchema } from "@/contracts";

const validBrief = {
  title: "A quiet city wakes",
  description:
    "An animated short about a night-shift baker discovering that the city is alive before dawn.",
  contentType: "short_film",
  targetAudience: "Families who enjoy gentle, imaginative animation.",
};

describe("brief input contract", () => {
  it("accepts the currently supported content types", () => {
    expect(briefInputSchema.parse(validBrief)).toMatchObject(validBrief);
  });

  it("rejects a future content type until the application contract is updated", () => {
    const result = briefInputSchema.safeParse({
      ...validBrief,
      contentType: "immersive_experience",
    });

    expect(result.success).toBe(false);
  });

  it("normalizes absent, empty, and null notes to null", () => {
    expect(briefInputSchema.parse(validBrief).notes).toBeNull();
    expect(briefInputSchema.parse({ ...validBrief, notes: "   " }).notes).toBeNull();
    expect(briefInputSchema.parse({ ...validBrief, notes: null }).notes).toBeNull();
  });
});
