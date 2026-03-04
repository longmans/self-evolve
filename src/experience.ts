import OpenAI from "openai";
import { truncateText } from "./prompt.js";
import type { SelfEvolveConfig } from "./types.js";

export type ToolTrace = {
  toolName: string;
  durationMs?: number;
  error?: string;
  params?: string;
  result?: string;
};

export type LlmTrace = {
  provider?: string;
  model?: string;
  usage?: string;
  assistantTexts: string[];
  reasoningSignals: string[];
};

export type ExperienceSummaryInput = {
  intent: string;
  assistantResponse: string;
  userFeedback: string;
  reward: number;
  llmTrace?: LlmTrace;
  toolTrace: ToolTrace[];
};

function safeJson(value: unknown, maxChars: number): string {
  try {
    const text = JSON.stringify(value);
    return truncateText(text, maxChars);
  } catch {
    return "";
  }
}

function collectReasoningSignals(source: unknown): string[] {
  const signals: string[] = [];
  function walk(value: unknown, path: string): void {
    if (signals.length >= 8) {
      return;
    }
    if (typeof value === "string") {
      const key = path.toLowerCase();
      if ((key.includes("reason") || key.includes("think")) && value.trim().length > 0) {
        signals.push(truncateText(value.trim(), 180));
      }
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        walk(value[index], `${path}[${index}]`);
      }
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      walk(child, `${path}.${key}`);
    }
  }
  walk(source, "assistant");
  return signals;
}

function usageToText(usage: unknown): string {
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) {
    return "";
  }
  const asUsage = usage as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["input", "output", "cacheRead", "cacheWrite", "total"]) {
    const value = asUsage[key];
    if (typeof value === "number") {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.join(" ");
}

export function buildLlmTrace(event: unknown, maxChars: number): LlmTrace {
  const asEvent = (event && typeof event === "object" ? event : {}) as Record<string, unknown>;
  const assistantTexts = Array.isArray(asEvent.assistantTexts)
    ? asEvent.assistantTexts
        .filter((value): value is string => typeof value === "string")
        .map((text) => truncateText(text, Math.floor(maxChars / 3)))
    : [];
  return {
    provider: typeof asEvent.provider === "string" ? asEvent.provider : undefined,
    model: typeof asEvent.model === "string" ? asEvent.model : undefined,
    usage: usageToText(asEvent.usage),
    assistantTexts,
    reasoningSignals: collectReasoningSignals(asEvent.lastAssistant),
  };
}

export function buildToolTrace(event: unknown, maxChars: number): ToolTrace {
  const asEvent = (event && typeof event === "object" ? event : {}) as Record<string, unknown>;
  return {
    toolName: typeof asEvent.toolName === "string" ? asEvent.toolName : "unknown",
    durationMs: typeof asEvent.durationMs === "number" ? asEvent.durationMs : undefined,
    error: typeof asEvent.error === "string" ? truncateText(asEvent.error, 220) : undefined,
    params: safeJson(asEvent.params, Math.floor(maxChars / 2)),
    result: safeJson(asEvent.result, Math.floor(maxChars / 2)),
  };
}

function parseSummary(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const summary = (parsed as Record<string, unknown>).summary;
    return typeof summary === "string" && summary.trim().length > 0 ? summary.trim() : null;
  } catch {
    return null;
  }
}

export class ExperienceSummarizer {
  private readonly openaiClient: OpenAI | null;

  constructor(private readonly config: SelfEvolveConfig) {
    this.openaiClient =
      config.experience.summarizer === "openai" && config.experience.apiKey
        ? new OpenAI({ apiKey: config.experience.apiKey, baseURL: config.experience.baseUrl })
        : null;
  }

  async summarize(input: ExperienceSummaryInput): Promise<string> {
    if (!this.openaiClient || this.config.experience.summarizer !== "openai") {
      return "";
    }
    const tracePayload = {
      intent: input.intent,
      assistantResponse: truncateText(input.assistantResponse, 700),
      userFeedback: truncateText(input.userFeedback, 420),
      reward: input.reward,
      llmTrace: input.llmTrace,
      toolTrace: input.toolTrace,
    };
    try {
      const completion = await this.openaiClient.chat.completions.create({
        model: this.config.experience.model,
        temperature: this.config.experience.temperature,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Summarize an agent trajectory into reusable procedural memory. Focus on what strategy worked/failed, key tool outcomes, and failure safeguards. Return strict JSON: {\"summary\": string}.",
          },
          {
            role: "user",
            content: JSON.stringify(tracePayload),
          },
        ],
      });
      const parsed = parseSummary(completion.choices[0]?.message?.content ?? "");
      if (!parsed) {
        return "";
      }
      return truncateText(parsed, this.config.experience.maxSummaryChars);
    } catch {
      return "";
    }
  }

  formatRawTrace(input: ExperienceSummaryInput): string {
    return truncateText(
      JSON.stringify(
        {
          llm: input.llmTrace,
          tools: input.toolTrace,
        },
        null,
        2,
      ),
      this.config.experience.maxRawChars,
    );
  }
}
