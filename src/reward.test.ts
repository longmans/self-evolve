import { describe, expect, it } from "vitest";
import { RewardScorer } from "./reward.js";
import type { SelfEvolveConfig } from "./types.js";

function config(overrides?: Partial<SelfEvolveConfig["reward"]>): SelfEvolveConfig {
  return {
    embedding: { provider: "hash", model: "x", dimensions: 64 },
    retrieval: { k1: 5, k2: 2, delta: 0, tau: 0, lambda: 0.5, epsilon: 0 },
    learning: { alpha: 0.3, gamma: 0, qInit: 0, rewardSuccess: 1, rewardFailure: -1 },
    memory: { maxEntries: 300, maxExperienceChars: 1000, includeFailures: true },
    reward: {
      provider: "openai",
      model: "gpt-4.1-mini",
      temperature: 0,
      ...overrides,
    },
    runtime: {
      minPromptChars: 6,
      minFeedbackChars: 2,
      observeTurns: 0,
      minAbsReward: 0,
      minRewardConfidence: 0,
    },
    experience: {
      summarizer: "openai",
      model: "gpt-4.1-mini",
      temperature: 0,
      maxToolEvents: 6,
      maxRawChars: 1200,
      maxSummaryChars: 500,
    },
  };
}

describe("RewardScorer", () => {
  it("returns unavailable when no reward model client is configured", async () => {
    const scorer = new RewardScorer(config());
    const result = await scorer.score({
      userFeedback: "works now",
      intent: "fix issue",
      assistantResponse: "run command",
    });
    expect(result.source).toBe("unavailable");
    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it("returns unavailable for blank feedback", async () => {
    const scorer = new RewardScorer(config());
    const result = await scorer.score({
      userFeedback: "   ",
      intent: "fix issue",
      assistantResponse: "run command",
    });
    expect(result.source).toBe("unavailable");
    expect(result.score).toBe(0);
  });
});
