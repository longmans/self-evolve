import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
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
  unavailableReason?: string;
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(-1, Math.min(1, value));
}

const RewardSchema = z.object({
  score: z.number(),
  confidence: z.number().nullable(),
  reason: z.string().nullable(),
});

function formatUnavailableReason(error: unknown): string {
  if (!(error instanceof Error)) {
    return "openai-request-failed:unknown";
  }
  const base = error.name || "Error";
  const message = error.message?.trim() || "no-message";
  const asRecord = error as Record<string, unknown>;
  const status =
    typeof asRecord.status === "number" ? ` status=${String(asRecord.status)}` : "";
  const code =
    typeof asRecord.code === "string" || typeof asRecord.code === "number"
      ? ` code=${String(asRecord.code)}`
      : "";
  return `openai-request-failed:${base}:${message}${status}${code}`;
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
      return { score: 0, confidence: 0, source: "unavailable", unavailableReason: "empty-feedback" };
    }
    if (!this.openaiClient || this.config.reward.provider !== "openai") {
      return {
        score: 0,
        confidence: 0,
        source: "unavailable",
        unavailableReason: "openai-client-unavailable",
      };
    }
    try {
      const response = await this.openaiClient.responses.parse({
        model: this.config.reward.model,
        temperature: this.config.reward.temperature,
        input: [
          {
            role: "system",
            content:
              [
                "You are a strict reward model for agent learning.",
                "Evaluate ONLY whether the user's latest message explicitly reflects satisfaction or dissatisfaction with the previous assistant response.",
                "Important rules:",
                "1) If the user is asking a new question, switching topic, or giving neutral continuation with no explicit judgment, score MUST stay near zero in [-0.1, 0.1].",
                "2) Use high positive/negative scores only when there is explicit evaluative signal (e.g., works/thanks/fixed vs wrong/still broken/error).",
                "3) If evidence is weak or ambiguous, keep score near zero and lower confidence.",
                "Return JSON only: {\"score\": number, \"confidence\": number, \"reason\": string}.",
                "score in [-1,1], confidence in [0,1].",
              ].join("\n"),
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
        text: {
          format: zodTextFormat(RewardSchema, "reward_feedback"),
        },
      });
      const parsed = response.output_parsed;
      if (!parsed) {
        return {
          score: 0,
          confidence: 0,
          source: "unavailable",
          unavailableReason: "empty-structured-output",
        };
      }
      return {
        score: clampScore(parsed.score),
        confidence:
          typeof parsed.confidence === "number"
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0,
        source: "openai",
      };
    } catch (error) {
      return {
        score: 0,
        confidence: 0,
        source: "unavailable",
        unavailableReason: formatUnavailableReason(error),
      };
    }
  }
}
