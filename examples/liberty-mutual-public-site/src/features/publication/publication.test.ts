import assert from "node:assert/strict";
import test from "node:test";
import {
  ANSWER_ROOT,
  ANSWER_TEMPLATE,
  DISCLOSURE_TEMPLATE,
  mapPublishedAnswer,
  searchDocument,
  type NativeAnswer,
  type SearchOperation,
} from "./content";
import { LiveContent } from "./live-content";
import { RedisReceiptStore } from "./receipt-store";
import { SearchPush } from "./search-push";
import { PublicationService } from "./publication-service";
import {
  parseTrigger,
  publicationGet,
  publicationPost,
} from "./publication-http";
import { contentGet } from "./content-http";
import { liveContent } from "./runtime";
import {
  revalidatePublicDelivery,
  PUBLIC_DELIVERY_PATH,
  PUBLIC_DELIVERY_TAGS,
} from "./delivery-revalidation";

const id = "11111111-2222-3333-4444-555555555555";
const secondId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const origin = "https://public.example.com";
const field = (value: unknown) => ({ jsonValue: { value } });
function answer(): NativeAnswer {
  return {
    id,
    path: `${ANSWER_ROOT}/bundle`,
    template: { id: ANSWER_TEMPLATE },
    version: 1,
    question: field("How do bundles work?"),
    answer: field("You can combine eligible coverages."),
    formalWording: field("<p>Terms depend on your policy.</p>"),
    explanation: field("<p>Review your coverage needs.</p>"),
    sourceLink: field({
      href: "https://www.libertymutual.com/bundling",
      text: "Liberty Mutual",
    }),
    canonicalUrl: field("/insurance-resources/bundle"),
    owner: field("Consumer insurance"),
    effectiveDate: field("2026-10-31T00:00:00Z"),
    reviewDate: field("20261031T000000Z"),
    audience: field("consumer"),
  };
}
const secret = "test-webhook-credential-1234567890";
const environment = { PUBLICATION_WEBHOOK_SECRET: secret };
const edge = {
  schemaVersion: 1,
  site: "liberty-mutual-public-site",
  event: "edge-publish-complete",
};
function request(body: unknown = edge, credential = secret) {
  return new Request(`${origin}/api/sitecore/publication`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/** HTTP contract harness exercises real Live reader, Search response parsing, durable-store commands, and handlers. */
function harness() {
  let content: NativeAnswer[] = [answer()];
  const redis = new Map<string, string>();
  const pushes: SearchOperation[][] = [];
  let liveReads = 0;
  let searchStatus = 200;
  const transport: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body));
    if (url.includes("/v1/content/api/graphql/v1")) {
      liveReads++;
      assert.equal(
        new Headers(init?.headers).get("x-sitecore-contextid"),
        "dedicated-live-context",
      );
      assert.equal(init?.cache, "no-store");
      assert.equal(body.variables.root, ANSWER_ROOT);
      return Response.json({
        data: {
          item: {
            path: ANSWER_ROOT,
            children: {
              results: structuredClone(content),
              pageInfo: { hasNext: false },
            },
          },
        },
      });
    }
    if (url.includes("/v1/index/source-one/push")) {
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "ApiKey test-push-api-key",
      );
      pushes.push(body.operations);
      if (searchStatus !== 200)
        return Response.json(
          { error: "Provider must not leak credentials" },
          { status: searchStatus },
        );
      return Response.json({
        status: "success",
        results: body.operations.map(
          (operation: SearchOperation, index: number) => ({
            action: operation.action,
            index,
            key: operation.id,
            statusCode: 200,
            succeeded: true,
          }),
        ),
      });
    }
    if (url === "https://redis.example.com") {
      const [command, ...args] = body;
      if (command === "SET") {
        if (args.includes("NX") && redis.has(args[0]))
          return Response.json({ result: null });
        redis.set(args[0], args[1]);
        return Response.json({ result: "OK" });
      }
      if (command === "GET")
        return Response.json({ result: redis.get(args[0]) ?? null });
      if (command === "EVAL") {
        const [
          ,
          ,
          leaseKey,
          stateKey,
          receiptKey,
          latestKey,
          lease,
          receipt,
          state,
        ] = args;
        if (redis.get(leaseKey) !== lease) return Response.json({ result: 0 });
        if (state) redis.set(stateKey, state);
        redis.set(receiptKey, receipt);
        redis.set(latestKey, receipt);
        redis.delete(leaseKey);
        return Response.json({ result: 1 });
      }
    }
    throw new Error("Unexpected transport");
  };
  const reader = new LiveContent("dedicated-live-context", origin, transport);
  const store = new RedisReceiptStore(
    "https://redis.example.com",
    "test-store-token",
    "source-one",
    transport,
  );
  const writer = new SearchPush(
    "https://edge-platform.sitecorecloud.io/op/fa55bd86-9d62-4171-a17a-89280f90d461/search/search-ingestion",
    "source-one",
    "test-push-api-key",
    transport,
    async () => undefined,
  );
  const service = new PublicationService(
    reader,
    writer,
    store,
    async () => undefined,
  );
  return {
    runtime: { service, store },
    reader,
    redis,
    pushes,
    setContent: (next: NativeAnswer[]) => {
      content = next;
    },
    setSearchStatus: (status: number) => {
      searchStatus = status;
    },
    liveReads: () => liveReads,
  };
}

test("every authenticated Edge publication refreshes public pages even when answers are unchanged", async () => {
  const h = harness();
  const paths: Array<[string, string]> = [];
  const tags: Array<[string, { expire: 0 }]> = [];
  const invalidate = () =>
    revalidatePublicDelivery({
      path: (path, type) => paths.push([path, type]),
      tag: (tag, profile) => tags.push([tag, profile]),
    });
  const first = await publicationPost(
    request(),
    environment,
    h.runtime,
    invalidate,
  );
  assert.equal(first.status, 200);
  const second = await publicationPost(
    request(),
    environment,
    h.runtime,
    invalidate,
  );
  const result = await second.json();
  assert.equal(second.status, 200);
  assert.equal(result.receipt.status, "unchanged");
  assert.equal(result.delivery.revalidated, true);
  assert.deepEqual(paths, [
    [PUBLIC_DELIVERY_PATH, "page"],
    [PUBLIC_DELIVERY_PATH, "page"],
  ]);
  assert.deepEqual(
    tags.map(([tag]) => tag),
    [...PUBLIC_DELIVERY_TAGS, ...PUBLIC_DELIVERY_TAGS],
  );
  assert.ok(tags.every(([, profile]) => profile.expire === 0));
  assert.equal(h.pushes.length, 1);
});

test("unauthorized or invalid triggers cannot expire caches, while a confirmed Edge publish still refreshes if Search fails", async () => {
  const h = harness();
  let invalidations = 0;
  const invalidate = () => {
    invalidations++;
    return revalidatePublicDelivery({ path: () => {}, tag: () => {} });
  };
  assert.equal(
    (
      await publicationPost(
        request(edge, "wrong"),
        environment,
        h.runtime,
        invalidate,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await publicationPost(
        request({ ...edge, site: "another-site" }),
        environment,
        h.runtime,
        invalidate,
      )
    ).status,
    400,
  );
  assert.equal(invalidations, 0);
  h.setSearchStatus(400);
  assert.equal(
    (await publicationPost(request(), environment, h.runtime, invalidate))
      .status,
    503,
  );
  assert.equal(invalidations, 1);
});

test("published native content preserves governance, source, canonical URL, and compact dates", () => {
  const mapped = mapPublishedAnswer(answer(), origin);
  assert.equal(mapped.canonicalUrl, `${origin}/insurance-resources/bundle`);
  assert.equal(mapped.effectiveDate, "20261031T000000Z");
  assert.equal(mapped.reviewDate, "20261031T000000Z");
  assert.equal(mapped.formalWording, "<p>Terms depend on your policy.</p>");
  assert.equal(
    mapped.sourceLink?.href,
    "https://www.libertymutual.com/bundling",
  );
  assert.throws(
    () =>
      mapPublishedAnswer(
        { ...answer(), path: "/sitecore/content/private/customer" },
        origin,
      ),
    /OUT_OF_SCOPE/,
  );
  assert.throws(
    () =>
      mapPublishedAnswer({ ...answer(), template: { id: secondId } }, origin),
    /OUT_OF_SCOPE/,
  );
  assert.throws(
    () =>
      mapPublishedAnswer(
        {
          ...answer(),
          canonicalUrl: field("https://private.example.com/account"),
        },
        origin,
      ),
    /CANONICAL/,
  );
  assert.throws(
    () =>
      mapPublishedAnswer(
        { ...answer(), effectiveDate: field("20260231T000000Z") },
        origin,
      ),
    /DATE/,
  );
  assert.throws(
    () =>
      mapPublishedAnswer(
        { ...answer(), disclosure: { targetId: secondId, targetItem: null } },
        origin,
      ),
    /MISSING_PUBLISHED_DISCLOSURE/,
  );
});

test("empty native disclosure dates stay absent while authored answer dates remain intact", () => {
  const published = mapPublishedAnswer(
    {
      ...answer(),
      disclosure: {
        targetId: secondId,
        targetItem: {
          id: secondId,
          path: "/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Disclosures/Product availability notice",
          template: { id: DISCLOSURE_TEMPLATE },
          title: field("Coverage and availability"),
          body: field("<p>Review your policy.</p>"),
          owner: field("Public website content team"),
          // Captured native layout's empty Date value and its compact equivalent.
          effectiveDate: field("0001-01-01T00:00:00Z"),
          reviewDate: field("00010101T000000Z"),
        },
      },
    },
    origin,
  );
  assert.equal(published.disclosure?.effectiveDate, "");
  assert.equal(published.disclosure?.reviewDate, "");
  assert.equal(published.effectiveDate, "20261031T000000Z");
  assert.equal(published.reviewDate, "20261031T000000Z");
});

test("no Preview/server-app context is substituted when dedicated Live context is missing", () => {
  assert.throws(
    () =>
      liveContent({
        SITECORE_EDGE_CONTEXT_ID: "preview-context",
        NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID: "browser-context",
        PUBLIC_SITE_URL: origin,
      }),
    /LIVE_CONTEXT_NOT_CONFIGURED/,
  );
});

test("authentication, payload limits, and scope checks run before reading or indexing content", async () => {
  const h = harness();
  assert.equal(
    (
      await publicationPost(
        request(edge, "wrong-password"),
        environment,
        h.runtime,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await publicationPost(
        request({ ...edge, site: "liberty-mutual-agent-portal" }),
        environment,
        h.runtime,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await publicationPost(
        request({ ...edge, content: "untrusted content" }),
        environment,
        h.runtime,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await publicationPost(
        request({ ...edge, extra: "x".repeat(65536) }),
        environment,
        h.runtime,
      )
    ).status,
    413,
  );
  assert.equal(h.liveReads(), 0);
  assert.equal(h.pushes.length, 0);
  assert.throws(
    () => parseTrigger({ EventName: "item:saved", Item: answer() }),
    /OUT_OF_SCOPE/,
  );
});

test("HTTP publication reconciles Live→Search→durable receipt, deduplicates delivery, and removes unpublished documents", async () => {
  const h = harness();
  const first = await publicationPost(request(), environment, h.runtime);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).receipt.status, "indexed");
  assert.equal(h.pushes.length, 1);
  assert.equal(h.pushes[0][0].id, id);
  assert.equal(h.pushes[0][0].fields?.effectivedate, "20261031T000000Z");
  const duplicate = await publicationPost(request(), environment, h.runtime);
  assert.equal((await duplicate.json()).receipt.status, "unchanged");
  assert.equal(h.pushes.length, 1);
  h.setContent([]);
  const removal = await publicationPost(request(), environment, h.runtime);
  assert.equal(removal.status, 200);
  assert.deepEqual(h.pushes[1], [
    {
      action: "delete",
      id,
      locale: "en",
      sc_url: `${origin}/insurance-resources/bundle`,
    },
  ]);
  const status = await publicationGet(
    new Request(`${origin}/api/sitecore/publication`, {
      headers: { Authorization: `Bearer ${secret}` },
    }),
    environment,
    h.runtime,
  );
  assert.equal((await status.json()).receipt.deletes, 1);
});

test("CMS end does not declare completion until a changed expected revision is visible on Live Edge", async () => {
  const h = harness();
  await publicationPost(request(), environment, h.runtime);
  const early = await publicationPost(
    request({ EventName: "publish:end", PublisherOptions: { Job: "new-job" } }),
    environment,
    h.runtime,
  );
  assert.equal(early.status, 503);
  assert.equal((await early.json()).error.code, "AWAITING_LIVE_PUBLICATION");
  assert.equal(h.pushes.length, 1);
  h.setContent([
    {
      ...answer(),
      version: 2,
      answer: field("A newly approved answer."),
    },
  ]);
  const completed = await publicationPost(
    request({ EventName: "publish:end", PublisherOptions: { Job: "new-job" } }),
    environment,
    h.runtime,
  );
  assert.equal(completed.status, 200);
  assert.equal(h.pushes.length, 2);
  assert.equal(h.pushes[1][0].fields?.summary, "A newly approved answer.");
});

test("an explicit expected revision must be observed before an authenticated reconciliation can complete", async () => {
  const h = harness();
  const future = { ...answer(), version: 2 };
  const body = {
    ...edge,
    expectedRevisions: { [id]: mapPublishedAnswer(future, origin).revision },
  };
  const waiting = await publicationPost(request(body), environment, h.runtime);
  assert.equal(waiting.status, 503);
  assert.equal((await waiting.json()).error.code, "AWAITING_LIVE_PUBLICATION");
  assert.equal(h.pushes.length, 0);
  h.setContent([future]);
  assert.equal(
    (await publicationPost(request(body), environment, h.runtime)).status,
    200,
  );
  assert.equal(h.pushes.length, 1);
});

test("a missing durable store fails explicitly before content or Search traffic", async () => {
  const response = await publicationPost(request(), environment);
  assert.equal(response.status, 503);
  assert.equal(
    (await response.json()).error.code,
    "PUBLICATION_STORE_NOT_CONFIGURED",
  );
});

test("failed indexing preserves the previous manifest and a safe failure receipt for replay", async () => {
  const h = harness();
  await publicationPost(request(), environment, h.runtime);
  h.setContent([
    {
      ...answer(),
      version: 2,
      answer: field("Approved second revision."),
    },
  ]);
  h.setSearchStatus(400);
  const rejected = await publicationPost(request(), environment, h.runtime);
  assert.equal(rejected.status, 503);
  const body = await rejected.json();
  assert.equal(body.receipt.status, "failed");
  assert.equal(body.receipt.errorCode, "SEARCH_PUSH_REJECTED");
  assert.equal(JSON.stringify(body).includes("test-push-api-key"), false);
  h.setSearchStatus(200);
  assert.equal(
    (await publicationPost(request(), environment, h.runtime)).status,
    200,
  );
  assert.equal(h.pushes.length, 3);
});

test("durable publication lease serializes concurrent writers", async () => {
  const h = harness();
  const lease = await h.runtime.store.acquire();
  const blocked = await publicationPost(request(), environment, h.runtime);
  assert.equal(blocked.status, 503);
  assert.equal((await blocked.json()).error.code, "PUBLICATION_BUSY");
  assert.equal(h.pushes.length, 0);
  await h.runtime.store.finish(lease, {
    id: "cleanup",
    status: "failed",
    trigger: "test",
    startedAt: "",
    finishedAt: "",
    upserts: 0,
    deletes: 0,
  });
});

test("public API uses only Live data, stable ETags, and scoped IDs; drafts and missing items are never exposed", async () => {
  const h = harness();
  const first = await contentGet(
    new Request(`${origin}/api/content/v1/answers`),
    undefined,
    h.reader,
  );
  assert.equal(first.status, 200);
  const body = await first.json();
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].id, id);
  const etag = first.headers.get("etag")!;
  assert.equal(
    (
      await contentGet(
        new Request(`${origin}/api/content/v1/answers`, {
          headers: { "If-None-Match": etag },
        }),
        undefined,
        h.reader,
      )
    ).status,
    304,
  );
  assert.equal(
    (
      await contentGet(
        new Request(`${origin}/api/content/v1/answers/${secondId}`),
        secondId,
        h.reader,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await contentGet(
        new Request(`${origin}/api/content/v1/answers?preview=true`),
        undefined,
        h.reader,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await contentGet(
        new Request(`${origin}/api/content/v1/answers/not-an-id`),
        "not-an-id",
        h.reader,
      )
    ).status,
    400,
  );
  h.setContent([]);
  assert.equal(
    (
      await contentGet(
        new Request(`${origin}/api/content/v1/answers/${id}`),
        id,
        h.reader,
      )
    ).status,
    404,
  );
  const unpublished = await contentGet(
    new Request(`${origin}/api/content/v1/answers`),
    undefined,
    h.reader,
  );
  assert.equal(
    JSON.stringify(await unpublished.json()).includes("combine eligible"),
    false,
  );
});

test("Live errors fail closed instead of masquerading as an empty published library", async () => {
  const reader = new LiveContent("live-context", origin, async () =>
    Response.json({ errors: [{ message: "private backend error" }] }),
  );
  const response = await contentGet(
    new Request(`${origin}/api/content/v1/answers`),
    undefined,
    reader,
  );
  assert.equal(response.status, 503);
  assert.equal(
    JSON.stringify(await response.json()).includes("private backend error"),
    false,
  );
});

test("Search207 retries only failed transient operations and validates per-operation results", async () => {
  const calls: SearchOperation[][] = [];
  const transport: typeof fetch = async (_url, init) => {
    const operations = JSON.parse(String(init?.body))
      .operations as SearchOperation[];
    calls.push(operations);
    return Response.json(
      {
        status: calls.length === 1 ? "partial_success" : "success",
        results: operations.map((operation, index) => ({
          index,
          action: operation.action,
          succeeded: !(calls.length === 1 && index === 1),
          statusCode: calls.length === 1 && index === 1 ? 503 : 200,
        })),
      },
      { status: calls.length === 1 ? 207 : 200 },
    );
  };
  const writer = new SearchPush(
    "https://edge-platform.sitecorecloud.io/op/fa55bd86-9d62-4171-a17a-89280f90d461/search/search-ingestion",
    "source-one",
    "test-api-key",
    transport,
    async () => undefined,
  );
  const operations: SearchOperation[] = [
    { action: "delete", id, locale: "en" },
    { action: "delete", id: secondId, locale: "en" },
  ];
  assert.equal(await writer.push(operations), 2);
  assert.deepEqual(calls[1], [operations[1]]);
});

test("Search batching respects 50 operations and stops on an invalid or oversized request", async () => {
  const counts: number[] = [];
  const transport: typeof fetch = async (_url, init) => {
    const operations = JSON.parse(String(init?.body))
      .operations as SearchOperation[];
    counts.push(operations.length);
    assert.ok(Buffer.byteLength(String(init?.body)) <= 512 * 1024);
    return Response.json({
      status: "success",
      results: operations.map((operation, index) => ({
        index,
        action: operation.action,
        succeeded: true,
        statusCode: 200,
      })),
    });
  };
  const writer = new SearchPush(
    "https://edge-platform.sitecorecloud.io/op/fa55bd86-9d62-4171-a17a-89280f90d461/search/search-ingestion",
    "source-one",
    "test-api-key",
    transport,
  );
  assert.equal(
    await writer.push(
      Array.from({ length: 51 }, (_, index) => ({
        action: "delete",
        id: String(index),
        locale: "en",
      })),
    ),
    51,
  );
  assert.deepEqual(counts, [50, 1]);
  await assert.rejects(
    writer.push([
      {
        action: "upsert",
        id,
        locale: "en",
        fields: { body: "x".repeat(512 * 1024) },
      },
    ]),
    /SEARCH_DOCUMENT_TOO_LARGE/,
  );
  assert.deepEqual(counts, [50, 1]);
  const invalid = new SearchPush(
    "https://edge-platform.sitecorecloud.io/op/fa55bd86-9d62-4171-a17a-89280f90d461/search/search-ingestion",
    "source-one",
    "test-api-key",
    async () => Response.json({ status: "success", results: [] }),
  );
  await assert.rejects(
    invalid.push([{ action: "delete", id, locale: "en" }]),
    /INVALID_SEARCH_RESPONSE/,
  );
});

test("Search writes exactly the native technical schema while the content API keeps its published contract", () => {
  const published = mapPublishedAnswer(answer(), origin);
  const operation = searchDocument(published);
  assert.deepEqual(
    Object.keys(operation.fields || {}).sort(),
    [
      "title",
      "question",
      "summary",
      "body",
      "canonicalurl",
      "sourceurl",
      "nextstepurl",
      "revision",
      "owner",
      "effectivedate",
      "reviewdate",
      "state",
      "product",
      "audience",
    ].sort(),
  );
  assert.equal(operation.id, published.id);
  assert.equal(operation.fields?.canonicalurl, published.canonicalUrl);
  assert.equal(operation.fields?.effectivedate, published.effectiveDate);
  assert.equal(operation.fields?.sourceurl, published.sourceLink?.href);
  assert.equal(Object.hasOwn(operation.fields || {}, "id"), false);
  assert.equal(Object.hasOwn(published, "canonicalUrl"), true);
});
