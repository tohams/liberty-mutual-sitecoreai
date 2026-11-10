import assert from "node:assert/strict";
import test from "node:test";
import type { AudiencePreviewInput } from "../../features/audience-preview/types";
import type { AudiencePreviewPage } from "../marketplace/audience-preview-pages";
import type { StateStore, StoredValue } from "../state/store";
import {
  createAudiencePreviewViewSession,
  limitAudiencePreviewRequests,
  PREVIEW_SESSION_SECONDS,
  readAudiencePreviewViewSession,
} from "./preview-sessions";

class MemoryStore implements StateStore {
  values = new Map<string, StoredValue<unknown>>();
  async read<T>(key: string) {
    return structuredClone(
      this.values.get(key) || null,
    ) as StoredValue<T> | null;
  }
  async compareAndSet<T>(
    key: string,
    expected: number | null,
    value: T,
    ttlSeconds: number | null,
  ) {
    const previous = this.values.get(key);
    if ((previous?.version ?? null) !== expected) return null;
    const next = {
      version: (previous?.version ?? -1) + 1,
      expiresAt: ttlSeconds === null ? null : Date.now() + ttlSeconds * 1000,
      value: structuredClone(value),
    };
    this.values.set(key, next);
    return structuredClone(next);
  }
  async persist<T>(): Promise<
    import("../state/store").PersistenceResult<T> | null
  > {
    return null;
  }
}

const page: AudiencePreviewPage = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Home",
  siteName: "liberty-mutual-agent-portal",
  path: "/",
  contentPath:
    "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
  language: "en",
  version: 3,
};
const input: AudiencePreviewInput = {
  role: "principal",
  licensedStates: ["TX"],
  specializesInSmallCommercial: true,
  agencySmallCommercialSharePercent: 15,
  agencyTotalWrittenPremiumUsd: 1_000_000,
  agentSmallCommercialWrittenPremiumUsd: 60_000,
};
const decisions = {
  pageId: page.id,
  selectedVariantIds: [],
  componentVariantIds: [],
  selections: [],
};

test("opaque preview URLs are stored only by hash, bound to the authenticated actor, and expire after five minutes", async () => {
  const store = new MemoryStore();
  let now = 1_700_000_000_000;
  const deps = { store, namespace: "test", now: () => now };
  const token = await createAudiencePreviewViewSession(
    "author-one",
    page,
    input,
    decisions,
    deps,
  );
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(
    [...store.values.keys()].some((key) => key.includes(token)),
    false,
  );
  assert.equal(
    (await readAudiencePreviewViewSession(token, "author-one", deps)).page
      .version,
    3,
  );
  await assert.rejects(
    () => readAudiencePreviewViewSession(token, "author-two", deps),
    /expired/,
  );
  await assert.rejects(
    () => readAudiencePreviewViewSession(`${token}x`, "author-one", deps),
    /expired/,
  );
  now += PREVIEW_SESSION_SECONDS * 1000;
  // Even a store that retains expired bytes cannot extend the preview lifetime.
  await assert.rejects(
    () => readAudiencePreviewViewSession(token, "author-one", deps),
    /expired/,
  );
});

test("preview authorization and page contents are fixed in the stored session rather than URL parameters", async () => {
  const store = new MemoryStore();
  const deps = { store, namespace: "test", now: () => 100_000 };
  const token = await createAudiencePreviewViewSession(
    "author",
    page,
    input,
    decisions,
    deps,
  );
  const value = await readAudiencePreviewViewSession(token, "author", deps);
  assert.deepEqual(value.input.licensedStates, ["TX"]);
  assert.equal(value.page.id, page.id);
  assert.equal(value.expiresAt - value.createdAt, 300_000);
  assert.equal(JSON.stringify(value).includes('author"'), false);
  assert.equal("accessToken" in value, false);
  assert.equal("browserId" in value, false);
});

test("preview polling is bounded per actor and recovers in the next rate window", async () => {
  const store = new MemoryStore();
  let now = 1_000;
  const deps = { store, namespace: "test", now: () => now };
  for (let count = 0; count < 60; count++)
    await limitAudiencePreviewRequests("author", deps);
  await assert.rejects(
    () => limitAudiencePreviewRequests("author", deps),
    /wait a minute/,
  );
  await limitAudiencePreviewRequests("another-author", deps);
  now += 60_000;
  await limitAudiencePreviewRequests("author", deps);
});
