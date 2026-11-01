import { randomUUID } from "node:crypto";
import { identifier, PublicationError } from "./content";

export interface PublicationState {
  schemaVersion: 1;
  snapshotHash: string;
  lastTriggerId: string;
  observedAt: string;
  documents: Record<string, { hash: string; url: string }>;
}
export interface PublicationReceipt {
  id: string;
  status: "indexed" | "unchanged" | "failed";
  trigger: string;
  startedAt: string;
  finishedAt: string;
  snapshotHash?: string;
  upserts: number;
  deletes: number;
  errorCode?: string;
}
export interface PublicationStore {
  acquire(): Promise<string>;
  state(): Promise<PublicationState | null>;
  finish(
    lease: string,
    receipt: PublicationReceipt,
    state?: PublicationState,
  ): Promise<void>;
  latest(): Promise<PublicationReceipt | null>;
}

/** A serverless-safe lease and atomic manifest commit; no in-memory production fallback. */
export class RedisReceiptStore implements PublicationStore {
  private readonly prefix: string;
  constructor(
    private readonly url: string,
    private readonly token: string,
    sourceId: string,
    private readonly transport: typeof fetch = fetch,
  ) {
    let endpoint: URL;
    try {
      endpoint = new URL(url);
    } catch {
      throw new PublicationError("PUBLICATION_STORE_NOT_CONFIGURED");
    }
    if (
      endpoint.protocol !== "https:" ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      !token.trim() ||
      !/^[a-z0-9_-]{1,200}$/i.test(sourceId)
    )
      throw new PublicationError("PUBLICATION_STORE_NOT_CONFIGURED");
    this.prefix = `lm-public:publication:v1:{${sourceId}}`;
  }
  private async command<T>(command: unknown[]): Promise<T> {
    try {
      const response = await this.transport(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(1500),
      });
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { result?: T; error?: unknown };
      if (body.error || !Object.hasOwn(body, "result")) throw new Error();
      return body.result as T;
    } catch {
      throw new PublicationError("PUBLICATION_STORE_UNAVAILABLE");
    }
  }
  async acquire(): Promise<string> {
    const lease = randomUUID();
    const result = await this.command<string | null>([
      "SET",
      `${this.prefix}:lease`,
      lease,
      "NX",
      "PX",
      90000,
    ]);
    if (result !== "OK") throw new PublicationError("PUBLICATION_BUSY");
    return lease;
  }
  async state(): Promise<PublicationState | null> {
    const value = await this.command<string | null>([
      "GET",
      `${this.prefix}:state`,
    ]);
    if (!value) return null;
    try {
      const state = JSON.parse(value) as PublicationState;
      if (
        state.schemaVersion !== 1 ||
        typeof state.snapshotHash !== "string" ||
        typeof state.lastTriggerId !== "string" ||
        !state.documents ||
        typeof state.documents !== "object" ||
        Array.isArray(state.documents) ||
        Object.keys(state.documents).length > 100
      )
        throw new Error();
      for (const [id, document] of Object.entries(state.documents)) {
        if (
          identifier(id) !== id ||
          !document ||
          typeof document.hash !== "string" ||
          !/^[a-f0-9]{64}$/.test(document.hash) ||
          typeof document.url !== "string" ||
          document.url.length > 2000 ||
          !document.url.startsWith("https://")
        )
          throw new Error();
      }
      return state;
    } catch {
      throw new PublicationError("INVALID_PUBLICATION_MANIFEST");
    }
  }
  async finish(
    lease: string,
    receipt: PublicationReceipt,
    state?: PublicationState,
  ): Promise<void> {
    const script = `if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
if ARGV[3]~='' then redis.call('SET',KEYS[2],ARGV[3]) end
redis.call('SET',KEYS[3],ARGV[2],'EX',2592000)
redis.call('SET',KEYS[4],ARGV[2])
redis.call('DEL',KEYS[1])
return 1`;
    const done = await this.command<number>([
      "EVAL",
      script,
      4,
      `${this.prefix}:lease`,
      `${this.prefix}:state`,
      `${this.prefix}:receipt:${receipt.id}`,
      `${this.prefix}:latest`,
      lease,
      JSON.stringify(receipt),
      state ? JSON.stringify(state) : "",
    ]);
    if (done !== 1) throw new PublicationError("PUBLICATION_LEASE_LOST");
  }
  async latest(): Promise<PublicationReceipt | null> {
    const value = await this.command<string | null>([
      "GET",
      `${this.prefix}:latest`,
    ]);
    if (!value) return null;
    try {
      return JSON.parse(value) as PublicationReceipt;
    } catch {
      throw new PublicationError("INVALID_PUBLICATION_RECEIPT");
    }
  }
}
