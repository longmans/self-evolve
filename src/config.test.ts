import { describe, expect, it } from "vitest";
import { selfEvolveConfigSchema } from "./config.js";

describe("selfEvolveConfigSchema", () => {
  it("provides runtime defaults", () => {
    const parsed = selfEvolveConfigSchema.parse(undefined);
    expect(parsed.runtime.observeTurns).toBe(3);
    expect(parsed.runtime.minAbsReward).toBe(0.15);
    expect(parsed.runtime.minRewardConfidence).toBe(0.55);
    expect(parsed.experience.maxToolEvents).toBe(12);
  });

  it("accepts runtime overrides", () => {
    const parsed = selfEvolveConfigSchema.parse({
      runtime: {
        minPromptChars: 10,
        minFeedbackChars: 3,
        observeTurns: 8,
        minAbsReward: 0.2,
        minRewardConfidence: 0.7,
      },
      experience: {
        maxToolEvents: 8,
        maxRawChars: 3000,
        maxSummaryChars: 600,
      },
    });
    expect(parsed.runtime.minPromptChars).toBe(10);
    expect(parsed.runtime.observeTurns).toBe(8);
    expect(parsed.runtime.minRewardConfidence).toBe(0.7);
    expect(parsed.experience.maxToolEvents).toBe(8);
  });
});
