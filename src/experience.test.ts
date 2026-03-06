import { describe, expect, it } from "vitest";
import {
  buildLlmTrace,
  buildToolTrace,
  ExperienceSummarizer,
  type ExperienceSummaryInput,
} from "./experience.js";
import type { SelfEvolveConfig } from "./types.js";

function config(): SelfEvolveConfig {
  return {
    embedding: { provider: "hash", model: "x", dimensions: 64 },
    retrieval: { k1: 5, k2: 2, delta: 0, tau: 0, lambda: 0.5, epsilon: 0 },
    learning: { alpha: 0.3, gamma: 0, qInit: 0, rewardSuccess: 1, rewardFailure: -1 },
    memory: { maxEntries: 300, maxExperienceChars: 1000, includeFailures: true },
    reward: { provider: "openai", model: "gpt-4.1-mini", temperature: 0 },
    runtime: {
      minPromptChars: 6,
      observeTurns: 0,
      minAbsReward: 0,
      minRewardConfidence: 0,
      learnMode: "balanced",
      noToolMinAbsReward: 0.8,
      noToolMinRewardConfidence: 0.9,
      newIntentSimilarityThreshold: 0.35,
      idleTurnsToClose: 2,
      pendingTtlMs: 900000,
      maxTurnsPerTask: 10,
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

describe("experience trace", () => {
  it("captures reasoning hints from llm output", () => {
    const trace = buildLlmTrace(
      {
        provider: "openai",
        model: "x",
        assistantTexts: ["answer"],
        lastAssistant: {
          thinkingSignature: "reasoning-token-abc",
          nested: { reasoningHint: "double-check config before restart" },
        },
      },
      1000,
    );
    expect(trace.reasoningSignals.length).toBeGreaterThan(0);
  });

  it("captures tool output trace safely", () => {
    const trace = buildToolTrace(
      {
        toolName: "bash",
        durationMs: 120,
        params: { command: "ls" },
        result: { ok: true, lines: 20 },
      },
      300,
    );
    expect(trace.toolName).toBe("bash");
    expect(trace.params?.includes("command")).toBe(true);
  });

  it("returns empty summary without configured summarizer client", async () => {
    const summarizer = new ExperienceSummarizer(config());
    const input: ExperienceSummaryInput = {
      intent: "fix install issue",
      assistantResponse: "run command and verify",
      userFeedback: "works now thanks",
      reward: 0.9,
      llmTrace: {
        provider: "openai",
        model: "x",
        usage: "input=10 output=20",
        assistantTexts: ["run x"],
        reasoningSignals: ["check prerequisites first"],
      },
      toolTrace: [{ toolName: "bash" }],
    };
    const summary = await summarizer.summarize(input);
    expect(summary).toBe("");
  });
});
