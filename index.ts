import { join } from "node:path";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { selfEvolveConfigSchema } from "./src/config.js";
import { createEmbeddingAdapter } from "./src/embedding.js";
import {
  buildLlmTrace,
  buildToolTrace,
  ExperienceSummarizer,
  type LlmTrace,
  type ToolTrace,
} from "./src/experience.js";
import { selectPhaseB } from "./src/policy.js";
import { buildMemRLContext, extractMessageText, truncateText } from "./src/prompt.js";
import { RewardScorer } from "./src/reward.js";
import { EpisodicStore } from "./src/store.js";
import type { ScoredCandidate } from "./src/types.js";

type PendingTurn = {
  prompt: string;
  queryEmbedding: number[];
  selected: ScoredCandidate[];
  assistantResponse?: string;
  turnIndex: number;
  toolTrace: ToolTrace[];
  llmTrace?: LlmTrace;
};

function resolveSessionKey(ctx: { sessionKey?: string; sessionId?: string }): string {
  return ctx.sessionKey ?? ctx.sessionId ?? "global";
}

function shouldTriggerRetrieval(prompt: string, minPromptChars: number): boolean {
  if (prompt.length < minPromptChars) {
    return false;
  }
  const normalized = prompt
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length === 0) {
    return false;
  }
  const nonLearnable = new Set([
    "hi",
    "hello",
    "hey",
    "thanks",
    "thank you",
    "ok",
    "okay",
    "good",
  ]);
  return !nonLearnable.has(normalized);
}

function debugLog(
  logger: { debug?: (message: string) => void },
  message: string,
): void {
  logger.debug?.(`[self-evolve] ${message}`);
}

const plugin = {
  id: "self-evolve",
  name: "Self Evolve",
  description: "MemRL-style self-evolving retrieval policy over episodic memory.",
  configSchema: selfEvolveConfigSchema,
  register(api: OpenClawPluginApi) {
    const config = selfEvolveConfigSchema.parse(api.pluginConfig);
    const adapter = createEmbeddingAdapter(config);
    const rewardScorer = new RewardScorer(config);
    const experienceSummarizer = new ExperienceSummarizer(config);
    const stateDir = api.runtime.state.resolveStateDir();
    const stateFile =
      config.memory.stateFile ?? join(stateDir, "plugins", "self-evolve", "episodic-memory.json");
    const store = new EpisodicStore(stateFile);
    const ready = store.load();
    const pendingBySession = new Map<string, PendingTurn>();
    const turnBySession = new Map<string, number>();

    debugLog(
      api.logger,
      `config loaded retrieval(k1=${config.retrieval.k1},k2=${config.retrieval.k2},delta=${config.retrieval.delta},tau=${config.retrieval.tau},lambda=${config.retrieval.lambda}) runtime(observeTurns=${config.runtime.observeTurns},minAbsReward=${config.runtime.minAbsReward},minRewardConfidence=${config.runtime.minRewardConfidence})`,
    );

    async function finalizePendingWithReward(params: {
      pending: PendingTurn;
      reward: number;
      feedbackText: string;
    }): Promise<void> {
      debugLog(
        api.logger,
        `learning start turn=${params.pending.turnIndex} selected=${params.pending.selected.length} reward=${params.reward.toFixed(3)} feedbackChars=${params.feedbackText.length}`,
      );
      store.updateQ({
        memoryIds: params.pending.selected.map((item) => item.triplet.id),
        reward: params.reward,
        alpha: config.learning.alpha,
        gamma: config.learning.gamma,
        bootstrapNextMax: 0,
      });

      if (params.reward > 0 || config.memory.includeFailures) {
        const summary = await experienceSummarizer.summarize({
          intent: params.pending.prompt,
          assistantResponse: params.pending.assistantResponse ?? "",
          userFeedback: params.feedbackText,
          reward: params.reward,
          llmTrace: params.pending.llmTrace,
          toolTrace: params.pending.toolTrace,
        });
        const rawTrace = experienceSummarizer.formatRawTrace({
          intent: params.pending.prompt,
          assistantResponse: params.pending.assistantResponse ?? "",
          userFeedback: params.feedbackText,
          reward: params.reward,
          llmTrace: params.pending.llmTrace,
          toolTrace: params.pending.toolTrace,
        });
        store.add({
          intent: params.pending.prompt,
          experience: truncateText(
            [
              `intent: ${params.pending.prompt}`,
              `summary: ${summary}`,
              `assistant: ${params.pending.assistantResponse ?? ""}`,
              `user_feedback: ${params.feedbackText}`,
              `reward: ${params.reward.toFixed(3)}`,
              `raw_trace_json: ${rawTrace}`,
            ]
              .join("\n")
              .trim(),
            config.memory.maxExperienceChars,
          ),
          embedding: params.pending.queryEmbedding,
          qInit: config.learning.qInit,
          maxEntries: config.memory.maxEntries,
        });
        debugLog(
          api.logger,
          `memory append summaryChars=${summary.length} rawTraceChars=${rawTrace.length} toolEvents=${params.pending.toolTrace.length} reasoningSignals=${params.pending.llmTrace?.reasoningSignals.length ?? 0}`,
        );
      }
      await store.save();
      debugLog(api.logger, "learning persisted to episodic store");
    }

    api.logger.info(
      `self-evolve: initialized (embedder=${adapter.name}, k1=${config.retrieval.k1}, k2=${config.retrieval.k2})`,
    );

    api.on("before_prompt_build", async (event, ctx) => {
      const prompt = event.prompt?.trim() ?? "";
      await ready;
      const sessionKey = resolveSessionKey(ctx);
      const currentTurn = (turnBySession.get(sessionKey) ?? 0) + 1;
      turnBySession.set(sessionKey, currentTurn);
      debugLog(
        api.logger,
        `hook before_prompt_build session=${sessionKey} turn=${currentTurn} promptChars=${prompt.length}`,
      );

      const previousPending = pendingBySession.get(sessionKey);
      if (previousPending) {
        let shouldLearn = false;
        let skipReason = "no-feedback";
        if (prompt.length >= config.runtime.minFeedbackChars) {
          const scored = await rewardScorer.score({
            userFeedback: prompt,
            intent: previousPending.prompt,
            assistantResponse: previousPending.assistantResponse ?? "",
          });
          const pastObserveWindow = previousPending.turnIndex > config.runtime.observeTurns;
          shouldLearn =
            pastObserveWindow &&
            Math.abs(scored.score) >= config.runtime.minAbsReward &&
            scored.confidence >= config.runtime.minRewardConfidence;
          if (!pastObserveWindow) {
            skipReason = "observe-window";
          } else if (Math.abs(scored.score) < config.runtime.minAbsReward) {
            skipReason = "reward-magnitude";
          } else if (scored.confidence < config.runtime.minRewardConfidence) {
            skipReason = "reward-confidence";
          } else {
            skipReason = "none";
          }
          api.logger.info(
            `self-evolve: feedback scored score=${scored.score.toFixed(3)} confidence=${scored.confidence.toFixed(3)} source=${scored.source} learn=${String(shouldLearn)}`,
          );
          if (shouldLearn) {
            await finalizePendingWithReward({
              pending: previousPending,
              reward: scored.score,
              feedbackText: prompt,
            });
          }
        }
        if (!shouldLearn) {
          debugLog(api.logger, `learning skipped turn=${previousPending.turnIndex} reason=${skipReason}`);
        }
        pendingBySession.delete(sessionKey);
      }

      if (!shouldTriggerRetrieval(prompt, config.runtime.minPromptChars)) {
        debugLog(api.logger, "retrieval skipped by trigger gate");
        return;
      }

      const queryEmbedding = await adapter.embed(prompt);
      if (queryEmbedding.length === 0) {
        debugLog(api.logger, "retrieval skipped due to empty embedding");
        return;
      }
      debugLog(api.logger, `embedding created dims=${queryEmbedding.length}`);
      const candidates = store.search(queryEmbedding, config);
      debugLog(api.logger, `phase-a candidates=${candidates.length}`);
      const phaseB = selectPhaseB({ candidates, config });
      debugLog(
        api.logger,
        `phase-b scored=${phaseB.scored.length} selected=${phaseB.selected.length} simMax=${phaseB.simMax.toFixed(3)}`,
      );
      if (phaseB.selected.length === 0) {
        // Bootstrap path: even without retrieved memories, keep this turn as pending so
        // the next user feedback can still create a new episodic memory entry.
        pendingBySession.set(sessionKey, {
          prompt,
          queryEmbedding,
          selected: [],
          turnIndex: currentTurn,
          toolTrace: [],
        });
        debugLog(api.logger, "retrieval returned null action; pending created for bootstrap learning");
        return;
      }

      pendingBySession.set(sessionKey, {
        prompt,
        queryEmbedding,
        selected: phaseB.selected,
        turnIndex: currentTurn,
        toolTrace: [],
      });
      debugLog(
        api.logger,
        `pending created selectedIds=${phaseB.selected.map((item) => item.triplet.id.slice(0, 8)).join(",")}`,
      );

      return {
        prependContext: buildMemRLContext(phaseB.selected),
      };
    });

    api.on("agent_end", async (event, ctx) => {
      await ready;
      const sessionKey = resolveSessionKey(ctx);
      const pending = pendingBySession.get(sessionKey);
      if (!pending) {
        debugLog(api.logger, "agent_end skipped: no pending turn");
        return;
      }

      const messages = Array.isArray(event.messages) ? event.messages : [];
      const assistantText = [...messages]
        .reverse()
        .find((message) => {
          if (!message || typeof message !== "object") {
            return false;
          }
          return (message as Record<string, unknown>).role === "assistant";
        });

      pendingBySession.set(sessionKey, {
        ...pending,
        assistantResponse: truncateText(
          extractMessageText(assistantText),
          config.memory.maxExperienceChars,
        ),
      });
      debugLog(
        api.logger,
        `agent_end captured assistantChars=${extractMessageText(assistantText).length} success=${String(event.success)}`,
      );
    });

    api.on("llm_output", (event, ctx) => {
      const sessionKey = resolveSessionKey(ctx);
      const pending = pendingBySession.get(sessionKey);
      if (!pending) {
        return;
      }
      pendingBySession.set(sessionKey, {
        ...pending,
        llmTrace: buildLlmTrace(event, config.experience.maxRawChars),
      });
      debugLog(
        api.logger,
        `llm_output captured provider=${event.provider} model=${event.model} assistantTexts=${event.assistantTexts.length}`,
      );
    });

    api.on("after_tool_call", (event, ctx) => {
      const sessionKey = resolveSessionKey(ctx);
      const pending = pendingBySession.get(sessionKey);
      if (!pending) {
        return;
      }
      const nextTrace = [...pending.toolTrace, buildToolTrace(event, config.experience.maxRawChars)].slice(
        -config.experience.maxToolEvents,
      );
      pendingBySession.set(sessionKey, {
        ...pending,
        toolTrace: nextTrace,
      });
      debugLog(
        api.logger,
        `tool trace append tool=${event.toolName} hasError=${String(Boolean(event.error))} durationMs=${event.durationMs ?? 0} toolEvents=${nextTrace.length}`,
      );
    });

    api.registerService({
      id: "self-evolve",
      start: async () => {
        await ready;
        api.logger.info(`self-evolve: loaded ${store.list().length} episodic memories`);
      },
      stop: async () => {
        debugLog(api.logger, `service stop drop pending without feedback=${pendingBySession.size}`);
        pendingBySession.clear();
        await store.save();
        api.logger.info("self-evolve: state saved");
      },
    });
  },
};

export default plugin;
