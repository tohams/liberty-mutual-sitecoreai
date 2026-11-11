import assert from "node:assert/strict";
import test from "node:test";
import type { StateStore, StoredValue } from "@/server/state/store";
import {
  createPersonalizationPreviewViewSession,
  readPersonalizationPreviewViewSession,
  limitPersonalizationPreviewRequests,
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
    ttl: number | null,
  ) {
    const previous = this.values.get(key);
    if ((previous?.version ?? null) !== expected) return null;
    const next = {
      version: (previous?.version ?? -1) + 1,
      expiresAt: ttl === null ? null : Date.now() + ttl * 1_000,
      value: structuredClone(value),
    };
    this.values.set(key, next);
    return structuredClone(next);
  }
  async persist<T>(): Promise<
    import("@/server/state/store").PersistenceResult<T> | null
  > {
    return null;
  }
}
const page = {
  id: "ae9e45ca-f127-4abe-9ca7-2ff109981998",
  name: "Home",
  path: "/",
  contentPath:
    "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
  siteName: "liberty-mutual-agent-portal",
  language: "en",
  version: 1,
};
const input = {
  page,
  revision: "a".repeat(64),
  selections: [],
  decisions: {
    pageId: page.id,
    selectedVariantIds: [],
    componentVariantIds: [],
    selections: [],
  },
  selectedExperiences: [],
};
test("preview links are actor-bound, hash-only, expire, and use a separate app namespace", async () => {
  const store = new MemoryStore();
  let now = 10_000;
  const deps = { store, namespace: "test", now: () => now };
  const token = await createPersonalizationPreviewViewSession(
    "author-one",
    input,
    deps,
  );
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  const key = [...store.values.keys()][0];
  assert.match(key, /:personalization-preview:view:/);
  assert.equal(key.includes(token), false);
  assert.equal(
    (await readPersonalizationPreviewViewSession(token, "author-one", deps))
      .page.id,
    page.id,
  );
  await assert.rejects(
    () => readPersonalizationPreviewViewSession(token, "author-two", deps),
    { code: "PREVIEW_EXPIRED" },
  );
  now += 300_000;
  await assert.rejects(
    () => readPersonalizationPreviewViewSession(token, "author-one", deps),
    { code: "PREVIEW_EXPIRED" },
  );
  assert.equal(
    JSON.stringify([...store.values.values()]).includes("author-one"),
    false,
  );
});
test("rate limits are isolated per app and author and recover in the next minute", async () => {
  const store = new MemoryStore();
  let now = 1_000;
  const deps = { store, namespace: "test", now: () => now };
  for (let i = 0; i < 40; i++)
    await limitPersonalizationPreviewRequests("author", deps);
  await assert.rejects(
    () => limitPersonalizationPreviewRequests("author", deps),
    { code: "RATE_LIMITED" },
  );
  await limitPersonalizationPreviewRequests("another-author", deps);
  now += 60_000;
  await limitPersonalizationPreviewRequests("author", deps);
  assert.equal(
    [...store.values.keys()].every((key) =>
      key.includes(":personalization-preview:rate:"),
    ),
    true,
  );
});
