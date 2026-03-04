import OpenAI from "openai";
import type { SelfEvolveConfig } from "./types.js";

export type RewardInput = {
  userFeedback: string;
  intent: string;
  assistantResponse: string;
};

export type RewardResult = {
  score: number;
  confidence: number;
  source: "openai" | "unavailable";
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(-1, Math.min(1, value));
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export class RewardScorer {
  private readonly openaiClient: OpenAI | null;

  constructor(private readonly config: SelfEvolveConfig) {
    this.openaiClient =
      config.reward.provider === "openai" && config.reward.apiKey
        ? new OpenAI({ apiKey: config.reward.apiKey, baseURL: config.reward.baseUrl })
        : null;
  }

  async score(input: RewardInput): Promise<RewardResult> {
    if (!input.userFeedback.trim()) {
      return { score: 0, confidence: 0, source: "unavailable" };
    }
    if (!this.openaiClient || this.config.reward.provider !== "openai") {
      return { score: 0, confidence: 0, source: "unavailable" };
    }
    try {
      const completion = await this.openaiClient.chat.completions.create({
        model: this.config.reward.model,
        temperature: this.config.reward.temperature,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a strict reward model for agent learning. Evaluate whether the user's latest message indicates satisfaction with the previous assistant response. Return JSON only: {\"score\": number, \"confidence\": number, \"reason\": string}. score must be in [-1, 1]. confidence must be in [0,1]. Positive score means helpful/correct. Negative means incorrect/unhelpful. Near 0 means unclear.",
          },
          {
            role: "user",
            content: [
              `Previous intent:\n${input.intent}`,
              `Assistant response:\n${input.assistantResponse}`,
              `User follow-up feedback:\n${input.userFeedback}`,
            ].join("\n\n"),
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const parsed = parseJsonObject(raw);
      const score = parsed?.score;
      const confidence = parsed?.confidence;
      if (typeof score !== "number") {
        return { score: 0, confidence: 0, source: "unavailable" };
      }
      return {
        score: clampScore(score),
        confidence: typeof confidence === "number" ? Math.max(0, Math.min(1, confidence)) : 0,
        source: "openai",
      };
    } catch {
      return { score: 0, confidence: 0, source: "unavailable" };
    }
  }
}
