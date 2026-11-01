import { PublicationError, type SearchOperation } from "./content";

export interface SearchWriter {
  push(operations: SearchOperation[], signal?: AbortSignal): Promise<number>;
}
export class SearchPush implements SearchWriter {
  private readonly endpoint: string;
  constructor(
    baseUrl: string,
    sourceId: string,
    private readonly apiKey: string,
    private readonly transport: typeof fetch = fetch,
    private readonly pause: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {
    let base: URL;
    try {
      base = new URL(baseUrl);
    } catch {
      throw new PublicationError("SEARCH_NOT_CONFIGURED");
    }
    if (
      base.protocol !== "https:" ||
      base.hostname !== "edge-platform.sitecorecloud.io" ||
      base.username ||
      base.password ||
      base.port ||
      !/^\/op\/[a-f0-9-]+\/search\/search-ingestion\/?$/i.test(base.pathname) ||
      base.search ||
      base.hash ||
      !/^[a-z0-9_-]{1,200}$/i.test(sourceId) ||
      !apiKey.trim()
    )
      throw new PublicationError("SEARCH_NOT_CONFIGURED");
    this.endpoint = `${base.href.replace(/\/$/, "")}/v1/index/${sourceId}/push`;
  }

  async push(
    operations: SearchOperation[],
    signal?: AbortSignal,
  ): Promise<number> {
    let completed = 0;
    let batch: SearchOperation[] = [];
    const submit = async () => {
      if (!batch.length) return;
      let pending = batch;
      if (
        Buffer.byteLength(JSON.stringify({ operations: pending })) >
        512 * 1024
      )
        throw new PublicationError("SEARCH_DOCUMENT_TOO_LARGE");
      for (let attempt = 0; attempt < 3; attempt++) {
        if (signal?.aborted) throw new PublicationError("PUBLICATION_DEADLINE");
        let response: Response;
        try {
          response = await this.transport(this.endpoint, {
            method: "POST",
            headers: {
              Authorization: `ApiKey ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ operations: pending }),
            signal: AbortSignal.any([
              AbortSignal.timeout(3500),
              ...(signal ? [signal] : []),
            ]),
            cache: "no-store",
            redirect: "error",
          });
        } catch {
          if (attempt === 2)
            throw new PublicationError("SEARCH_PUSH_UNAVAILABLE");
          await this.pause(150 * 3 ** attempt);
          continue;
        }
        if (response.status === 200 || response.status === 207) {
          let body: {
            results?: Array<{
              index: number;
              action: string;
              statusCode: number;
              succeeded: boolean;
            }>;
          };
          try {
            body = await response.json();
          } catch {
            throw new PublicationError("INVALID_SEARCH_RESPONSE");
          }
          if (
            !Array.isArray(body.results) ||
            body.results.length !== pending.length
          )
            throw new PublicationError("INVALID_SEARCH_RESPONSE");
          const seen = new Set<number>();
          const retry: SearchOperation[] = [];
          for (const result of body.results) {
            if (
              !Number.isSafeInteger(result.index) ||
              result.index < 0 ||
              result.index >= pending.length ||
              seen.has(result.index) ||
              result.action !== pending[result.index].action ||
              typeof result.succeeded !== "boolean" ||
              !Number.isSafeInteger(result.statusCode)
            )
              throw new PublicationError("INVALID_SEARCH_RESPONSE");
            seen.add(result.index);
            if (
              result.succeeded &&
              result.statusCode >= 200 &&
              result.statusCode < 300
            )
              completed++;
            else if (
              !result.succeeded &&
              (result.statusCode === 429 || result.statusCode >= 500)
            )
              retry.push(pending[result.index]);
            else throw new PublicationError("SEARCH_PUSH_REJECTED");
          }
          if (!retry.length) return;
          if (attempt === 2)
            throw new PublicationError("SEARCH_PUSH_UNAVAILABLE");
          pending = retry;
          await this.pause(150 * 3 ** attempt);
          continue;
        }
        if (response.status !== 429 && response.status < 500)
          throw new PublicationError("SEARCH_PUSH_REJECTED");
        if (attempt === 2)
          throw new PublicationError("SEARCH_PUSH_UNAVAILABLE");
        await this.pause(150 * 3 ** attempt);
      }
    };
    for (const operation of operations) {
      if (
        batch.length === 50 ||
        Buffer.byteLength(
          JSON.stringify({ operations: [...batch, operation] }),
        ) >
          512 * 1024
      ) {
        await submit();
        batch = [];
      }
      batch.push(operation);
    }
    await submit();
    return completed;
  }
}
