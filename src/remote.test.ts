import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoteMemoryClient } from "./remote.js";

function makeClient(filePath: string): RemoteMemoryClient {
  return new RemoteMemoryClient({
    baseUrl: "http://127.0.0.1:8080",
    timeoutMs: 3000,
    requestKeyIdFile: filePath,
    logger: {},
  });
}

function makeClientWithV1Base(filePath: string): RemoteMemoryClient {
  return new RemoteMemoryClient({
    baseUrl: "https://self-evolve.club/api/v1",
    timeoutMs: 3000,
    requestKeyIdFile: filePath,
    logger: {},
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("RemoteMemoryClient", () => {
  it("registers and persists request key id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "self-evolve-remote-"));
    const keyFile = join(dir, "request-key.json");

    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1/clients/register")) {
        return new Response(JSON.stringify({ request_key_id: "rk_123" }), { status: 200 });
      }
      if (url.endsWith("/v1/triplets/ingest")) {
        expect(init?.body).toContain("rk_123");
        expect(init?.body).toContain("request-key-id");
        expect(init?.body).not.toContain("\"intent\"");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = makeClient(keyFile);
    await client.ingest({
      triplet: {
        id: "t1",
        intent: "intent",
        experience: "experience",
        embedding: [0.1, 0.2],
        qValue: 0.3,
        visits: 0,
        selectedCount: 0,
        successCount: 0,
        lastReward: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    });

    const persisted = JSON.parse(await readFile(keyFile, "utf8")) as { requestKeyId: string };
    expect(persisted.requestKeyId).toBe("rk_123");
    const mode = (await stat(keyFile)).mode & 0o777;
    expect(mode).toBe(0o600);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reuses local request key and maps remote search matches", async () => {
    const dir = await mkdtemp(join(tmpdir(), "self-evolve-remote-"));
    const keyFile = join(dir, "request-key.json");

    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1/triplets/search")) {
        expect(init?.body).toContain("rk_local");
        expect(init?.body).toContain("request-key-id");
        return new Response(
          JSON.stringify({
            matches: [
              {
                similarity: 0.88,
                triplet: {
                  id: "rt1",
                  experience: "remote experience",
                  embedding: [0.2, 0.3],
                  q_value: 0.6,
                  owner_request_key_id: "owner_a",
                },
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    // seed local key
    await writeFile(keyFile, JSON.stringify({ requestKeyId: "rk_local" }), "utf8");

    const client = makeClient(keyFile);
    const matches = await client.search({ queryEmbedding: [0.1, 0.2], topK: 5, delta: 0.1 });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.source).toBe("remote");
    expect(matches[0]?.ownerRequestKeyId).toBe("owner_a");
    expect(matches[0]?.triplet.id).toBe("rt1");
    expect(matches[0]?.triplet.intent).toBe("");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not duplicate v1 when baseUrl already ends with /v1", async () => {
    const dir = await mkdtemp(join(tmpdir(), "self-evolve-remote-"));
    const keyFile = join(dir, "request-key.json");

    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      expect(url).toContain("/api/v1/clients/register");
      expect(url).not.toContain("/v1/v1/");
      return new Response(JSON.stringify({ request_key_id: "rk_abc" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = makeClientWithV1Base(keyFile);
    const key = await client.ensureRequestKeyId();

    expect(key).toBe("rk_abc");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
