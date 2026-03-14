import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { EpisodicTriplet, RetrievalCandidate } from "./types.js";

type Logger = {
  debug?: (message: string) => void;
  warn?: (message: string) => void;
};

type RemoteSearchMatch = {
  similarity: number;
  triplet: {
    id: string;
    experience: string;
    embedding: number[];
    q_value: number;
    owner_request_key_id?: string;
  };
};

export class RemoteMemoryClient {
  private requestKeyId: string | null = null;
  private readonly apiPrefix: string;

  constructor(
    private readonly options: {
      baseUrl: string;
      timeoutMs: number;
      requestKeyIdFile: string;
      logger: Logger;
    },
  ) {
    const normalized = options.baseUrl.replace(/\/+$/, "");
    this.apiPrefix = normalized.endsWith("/v1") ? "" : "/v1";
  }

  private endpoint(path: string): string {
    return `${this.apiPrefix}${path}`;
  }

  private async request<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(`${this.options.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`http ${response.status}: ${body.slice(0, 300)}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private async readStoredRequestKeyId(): Promise<string | null> {
    try {
      const raw = await readFile(this.options.requestKeyIdFile, "utf8");
      const parsed = JSON.parse(raw) as { requestKeyId?: unknown };
      return typeof parsed.requestKeyId === "string" && parsed.requestKeyId.trim().length > 0
        ? parsed.requestKeyId
        : null;
    } catch {
      return null;
    }
  }

  private async persistRequestKeyId(requestKeyId: string): Promise<void> {
    await mkdir(dirname(this.options.requestKeyIdFile), { recursive: true });
    await writeFile(
      this.options.requestKeyIdFile,
      JSON.stringify({ requestKeyId }, null, 2),
      { encoding: "utf8", mode: 0o600 },
    );
    await chmod(this.options.requestKeyIdFile, 0o600);
  }

  async ensureRequestKeyId(): Promise<string> {
    if (this.requestKeyId) {
      return this.requestKeyId;
    }
    const stored = await this.readStoredRequestKeyId();
    if (stored) {
      this.requestKeyId = stored;
      return stored;
    }
    const registered = await this.request<{ request_key_id: string }>(
      this.endpoint("/clients/register"),
      {},
    );
    if (!registered.request_key_id || registered.request_key_id.trim().length === 0) {
      throw new Error("register returned empty request_key_id");
    }
    await this.persistRequestKeyId(registered.request_key_id);
    this.requestKeyId = registered.request_key_id;
    this.options.logger.debug?.("[self-evolve] remote request key registered");
    return registered.request_key_id;
  }

  async ingest(params: { triplet: EpisodicTriplet }): Promise<void> {
    const requestKeyId = await this.ensureRequestKeyId();
    await this.request(this.endpoint("/triplets/ingest"), {
      "request-key-id": requestKeyId,
      triplet: {
        id: params.triplet.id,
        experience: params.triplet.experience,
        embedding: params.triplet.embedding,
        q_value: params.triplet.qValue,
        created_at: params.triplet.createdAt,
        updated_at: params.triplet.updatedAt,
      },
    });
  }

  async search(params: {
    queryEmbedding: number[];
    topK: number;
    delta: number;
  }): Promise<RetrievalCandidate[]> {
    const requestKeyId = await this.ensureRequestKeyId();
    const response = await this.request<{ matches?: RemoteSearchMatch[] }>(
      this.endpoint("/triplets/search"),
      {
        "request-key-id": requestKeyId,
        query_embedding: params.queryEmbedding,
        top_k: params.topK,
        delta: params.delta,
      },
    );
    const matches = Array.isArray(response.matches) ? response.matches : [];
    return matches
      .filter((match) => match && typeof match.similarity === "number" && match.triplet)
      .map((match) => ({
        source: "remote" as const,
        ownerRequestKeyId: match.triplet.owner_request_key_id,
        similarity: match.similarity,
        triplet: {
          id: match.triplet.id,
          intent: "",
          experience: match.triplet.experience,
          embedding: Array.isArray(match.triplet.embedding) ? match.triplet.embedding : [],
          qValue: match.triplet.q_value,
          visits: 0,
          selectedCount: 0,
          successCount: 0,
          lastReward: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }));
  }

  async feedback(params: {
    reward: number;
    taskId: string;
    usedTriplets: Array<{ tripletId: string; ownerRequestKeyId?: string }>;
  }): Promise<void> {
    if (params.usedTriplets.length === 0) {
      return;
    }
    const requestKeyId = await this.ensureRequestKeyId();
    await this.request(this.endpoint("/triplets/feedback"), {
      "request-key-id": requestKeyId,
      task_id: params.taskId,
      reward: params.reward,
      used_triplets: params.usedTriplets.map((item) => ({
        triplet_id: item.tripletId,
        owner_request_key_id: item.ownerRequestKeyId,
      })),
    });
  }
}
