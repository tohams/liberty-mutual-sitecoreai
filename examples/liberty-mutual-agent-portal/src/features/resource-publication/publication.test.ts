import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  mapPublishedResource,
  RESOURCE_ROOT,
  RESOURCE_TEMPLATE,
  searchDocument,
  type NativeResource,
  type SearchOperation,
} from "./content";
import { LiveResources } from "./live-content";
import { publicationGet, publicationPost } from "./publication-http";
import { PublicationService } from "./publication-service";
import { RedisReceiptStore } from "./receipt-store";
import { publicationRuntime, resourceOrigin } from "./runtime";
import { SearchPush } from "./search-push";

const origin = "https://portal.example.com";
const firstId = "11111111-2222-5333-8444-555555555555";
const secondId = "aaaaaaaa-bbbb-5ccc-8ddd-eeeeeeeeeeee";
const sourceId = "26cf5bd0-b285-4a7d-93f9-9e3dac91b202";
const secret = "test-portal-resource-hook-credential";
const field = (value: unknown) => ({ jsonValue: { value } });
function resource(): NativeResource {
  return {
    id: firstId,
    name: "employer-guide",
    path: RESOURCE_ROOT + "/employer-guide",
    template: { id: RESOURCE_TEMPLATE },
    version: 3,
    title: field("Prepare an employer conversation"),
    summary: field("Review the preparation guide for your next conversation."),
    body: field("<p>Review operations &amp; coverage before submitting.</p>"),
    state: field("TX"),
    businessFamily: field("small-commercial"),
    product: field("workers-compensation"),
    channel: field("independent-agent"),
    resourceType: field("State guidance"),
  };
}
function checklist(folder: string, names: string[]) {
  const items = names.map((name, index) => ({
    id: `${String(index + 1).padStart(8, "0")}-2222-5333-8444-555555555555`,
    name,
    path: `/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Data/Taxonomy/${folder}/${name}`,
    template: { id: "9dc18d3c-9944-507a-aeab-9787c8fc4d9c" },
  }));
  return {
    value: items.map((item) => `{${item.id}}`).join("|"),
    targetIds: items.map((item) => item.id),
    targetItems: items,
  };
}
const body = {
  schemaVersion: 1,
  site: "liberty-mutual-agent-portal",
  event: "edge-publish-complete",
};
function request(payload: unknown = body, credential = secret) {
  return new Request(origin + "/api/sitecore/resource-publication", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/** Exercises the real Live reader, Push writer, durable store, and authenticated HTTP handler. */
function harness() {
  let resources = [resource()];
  let failLive = false;
  let partial = false;
  let rejectPush = false;
  let reads = 0;
  const pushes: SearchOperation[][] = [];
  const redis = new Map<string, string>();
  const commands: unknown[][] = [];
  const transport: typeof fetch = async (input, init) => {
    const url = String(input);
    const payload = JSON.parse(String(init?.body));
    if (url.endsWith("/v1/content/api/graphql/v1")) {
      reads++;
      assert.equal(
        new Headers(init?.headers).get("x-sitecore-contextid"),
        "portal-dedicated-live",
      );
      assert.equal(payload.variables.root, RESOURCE_ROOT);
      assert.match(payload.query, /\.\.\. on MultilistField/);
      assert.equal(init?.cache, "no-store");
      if (failLive)
        return Response.json({
          errors: [{ message: "Private provider details" }],
        });
      return Response.json({
        data: {
          item: {
            path: RESOURCE_ROOT,
            children: {
              results: structuredClone(resources),
              pageInfo: { hasNext: partial },
            },
          },
        },
      });
    }
    if (url.endsWith(`/v1/index/${sourceId}/push`)) {
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "ApiKey test-push-key",
      );
      pushes.push(payload.operations);
      if (rejectPush)
        return Response.json(
          { privateError: "credential must not leak" },
          { status: 400 },
        );
      return Response.json({
        results: payload.operations.map(
          (operation: SearchOperation, index: number) => ({
            index,
            action: operation.action,
            key: operation.id,
            succeeded: true,
            statusCode: 200,
          }),
        ),
      });
    }
    assert.equal(url, "https://redis.example.com");
    commands.push(payload);
    const [command, ...args] = payload;
    if (command === "GET")
      return Response.json({ result: redis.get(args[0]) ?? null });
    if (command === "SET") {
      if (args.includes("NX") && redis.has(args[0]))
        return Response.json({ result: null });
      redis.set(args[0], args[1]);
      return Response.json({ result: "OK" });
    }
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
    throw new Error("Unexpected durable command");
  };
  const store = new RedisReceiptStore(
    "https://redis.example.com",
    "test-redis-key",
    sourceId,
    transport,
  );
  const reader = new LiveResources("portal-dedicated-live", origin, transport);
  const writer = new SearchPush(
    "https://edge-platform.sitecorecloud.io/op/97eea84c-ac47-4d91-7e4f-08defdaaa7df/search/search-ingestion",
    sourceId,
    "test-push-key",
    transport,
    async () => {},
  );
  const runtime = {
    store,
    service: new PublicationService(reader, writer, store, async () => {}),
  };
  const post = (payload: unknown = body, credential = secret) =>
    publicationPost(
      request(payload, credential),
      {
        PORTAL_RESOURCE_PUBLICATION_WEBHOOK_SECRET: secret,
      },
      runtime,
    );
  return {
    post,
    runtime,
    pushes,
    commands,
    reads: () => reads,
    setResources: (next: NativeResource[]) => {
      resources = next;
    },
    failLive: () => {
      failLive = true;
    },
    partial: () => {
      partial = true;
    },
    rejectPush: () => {
      rejectPush = true;
    },
  };
}

test("published native Checklist selections retain independent tokens and explicit nationwide scope", () => {
  const mapped = mapPublishedResource(
    {
      ...resource(),
      state: checklist("Risk states", ["TX", "IL"]),
      product: checklist("Products", [
        "commercial-auto",
        "workers-compensation",
      ]),
    },
    origin,
  );
  assert.deepEqual(mapped.state, ["IL", "TX"]);
  assert.deepEqual(mapped.product, ["commercial-auto", "workers-compensation"]);
  const operation = searchDocument(mapped);
  assert.equal(operation.sc_url, origin + "/resources/employer-guide");
  assert.equal(operation.fields?.title, "Prepare an employer conversation");
  assert.equal(
    operation.fields?.body,
    "Review operations & coverage before submitting.",
  );
  assert.equal(operation.fields?.state, "IL,TX");
  assert.equal(
    operation.fields?.product,
    "commercial-auto,workers-compensation",
  );
  assert(
    Object.values(operation.fields!).every(
      (value) => typeof value === "string",
    ),
  );
  assert.deepEqual(
    mapPublishedResource({ ...resource(), state: field("All") }, origin).state,
    ["All"],
  );
  assert.throws(
    () =>
      mapPublishedResource(
        { ...resource(), state: checklist("Risk states", ["All", "TX"]) },
        origin,
      ),
    /INVALID_PUBLISHED_RESOURCE_METADATA/,
  );
});

test("foreign, unpublished, unknown, or malformed references cannot become search documents", () => {
  for (const invalid of [
    { ...resource(), path: "/sitecore/content/Other/resources/employer-guide" },
    { ...resource(), template: { id: secondId } },
    { ...resource(), product: field(`${firstId},workers-compensation`) },
    { ...resource(), state: field("OR") },
    { ...resource(), state: field("") },
  ])
    assert.throws(() => mapPublishedResource(invalid, origin));
  const missing = checklist("Products", ["commercial-auto"]);
  missing.targetItems = [];
  assert.throws(
    () => mapPublishedResource({ ...resource(), product: missing }, origin),
    /INVALID_PUBLISHED_RESOURCE_METADATA/,
  );
  const foreign = checklist("Products", ["commercial-auto"]);
  foreign.targetItems[0].path =
    "/sitecore/content/Other/Products/commercial-auto";
  assert.throws(
    () => mapPublishedResource({ ...resource(), product: foreign }, origin),
    /INVALID_PUBLISHED_RESOURCE_METADATA/,
  );
});

test("authorization, source scope, and payload validation run before any content or Search calls", async () => {
  const f = harness();
  assert.equal((await f.post(body, "wrong")).status, 401);
  assert.equal(
    (await f.post({ ...body, site: "liberty-mutual-public-site" })).status,
    400,
  );
  assert.equal(
    (await f.post({ ...body, event: "delete-everything" })).status,
    400,
  );
  assert.equal(
    (await f.post({ ...body, fields: { body: "untrusted replacement" } }))
      .status,
    400,
  );
  assert.equal(
    (await f.post({ ...body, expectedRevisions: { [firstId]: "wrong" } }))
      .status,
    400,
  );
  assert.equal(
    (await f.post({ ...body, padding: "x".repeat(66000) })).status,
    413,
  );
  assert.equal(f.reads(), 0);
  assert.equal(f.pushes.length, 0);
  assert.equal(f.commands.length, 0);
});

test("authenticated Edge publication updates, deduplicates, and deletes only the Portal manifest", async () => {
  const f = harness();
  const first = await f.post();
  assert.equal(first.status, 200);
  assert.equal((await first.json()).receipt.upserts, 1);
  assert(
    f.commands
      .filter(([command]) => command === "SET")
      .every(([, key]) =>
        String(key).startsWith("lm-portal:resource-publication:v1:"),
      ),
  );
  assert.equal((await (await f.post()).json()).receipt.status, "unchanged");
  assert.equal(f.pushes.length, 1);
  f.setResources([
    { ...resource(), version: 4, summary: field("New approved summary.") },
  ]);
  assert.equal((await (await f.post()).json()).receipt.upserts, 1);
  assert.equal(f.pushes.at(-1)?.[0].fields?.summary, "New approved summary.");
  f.setResources([]);
  const removed = await f.post();
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).receipt.deletes, 1);
  assert.deepEqual(f.pushes.at(-1), [
    {
      action: "delete",
      id: firstId,
      locale: "en",
      sc_url: origin + "/resources/employer-guide",
    },
  ]);
  const status = await publicationGet(
    new Request(origin + "/api/sitecore/resource-publication", {
      headers: { authorization: `Bearer ${secret}` },
    }),
    {
      PORTAL_RESOURCE_PUBLICATION_WEBHOOK_SECRET: secret,
    },
    f.runtime,
  );
  assert.equal(status.status, 200);
  assert.equal((await status.json()).receipt.deletes, 1);
});

test("an incomplete or failed Live read preserves the complete manifest and index", async () => {
  for (const fail of ["failLive", "partial"] as const) {
    const f = harness();
    await f.post();
    const before = await f.runtime.store.state();
    f[fail]();
    const failed = await f.post();
    assert.equal(failed.status, 503);
    assert.deepEqual(await f.runtime.store.state(), before);
    assert.equal(f.pushes.length, 1);
    assert.equal((await failed.json()).receipt.status, "failed");
  }
});

test("provider errors cannot leak credentials or advance a rejected Search update", async () => {
  const f = harness();
  await f.post();
  const before = await f.runtime.store.state();
  f.setResources([
    { ...resource(), version: 4, summary: field("Changed copy") },
  ]);
  f.rejectPush();
  const result = await f.post();
  assert.equal(result.status, 503);
  assert.deepEqual(await f.runtime.store.state(), before);
  const failure = await result.text();
  assert.match(failure, /SEARCH_PUSH_REJECTED/);
  assert(!failure.includes("test-push-key"));
  assert(!failure.includes("credential must not leak"));
});

test("CMS publish:end waits for Live changes instead of confirming unchanged old content", async () => {
  const f = harness();
  const cms = {
    EventName: "publish:end",
    PublisherOptions: { language: "en" },
  };
  assert.equal((await f.post(cms)).status, 503);
  assert.equal(f.pushes.length, 0);
  await f.post();
  assert.equal((await f.post(cms)).status, 503);
  f.setResources([
    { ...resource(), version: 4, summary: field("Published copy") },
  ]);
  assert.equal((await f.post(cms)).status, 200);
});

test("concurrent webhook requests cannot claim a second durable lease", async () => {
  const f = harness();
  const lease = await f.runtime.store.acquire();
  const result = await f.post();
  assert.equal(result.status, 503);
  assert.match(await result.text(), /PUBLICATION_BUSY/);
  assert.equal(f.reads(), 0);
  await f.runtime.store.finish(lease, {
    id: secondId,
    status: "unchanged",
    trigger: "reconcile",
    startedAt: "",
    finishedAt: "",
    upserts: 0,
    deletes: 0,
  });
});

test("runtime never substitutes Preview configuration or either existing source", () => {
  assert.throws(
    () => new LiveResources("", origin),
    /RESOURCE_LIVE_CONTEXT_NOT_CONFIGURED/,
  );
  assert.throws(
    () =>
      resourceOrigin({
        PORTAL_RESOURCE_PUBLIC_ORIGIN: "http://portal.example.com",
      }),
    /RESOURCE_ORIGIN_NOT_CONFIGURED/,
  );
  assert.throws(
    () => publicationRuntime({ SITECORE_EDGE_CONTEXT_ID: "preview" }),
    /RESOURCE_SOURCE_NOT_CONFIGURED/,
  );
  for (const id of [
    "b5e24aff-8b5b-4653-bf66-deef52c1241a",
    "f527245d-98c7-4978-8802-237d7717ca43",
  ])
    assert.throws(
      () => publicationRuntime({ PORTAL_RESOURCE_SEARCH_SOURCE_ID: id }),
      /RESOURCE_SOURCE_NOT_DEDICATED/,
    );
});

test("the external webhook route bypasses the Portal session proxy and keeps dedicated Bearer authorization", async () => {
  const proxy = await readFile(
    new URL("../../proxy.ts", import.meta.url),
    "utf8",
  );
  const route = await readFile(
    new URL(
      "../../app/api/sitecore/resource-publication/route.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(proxy, /\(\?!api\/\|/);
  assert.match(route, /return publicationPost\(request\)/);
  const result = await publicationPost(
    new Request(origin + "/api/sitecore/resource-publication", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { PORTAL_RESOURCE_PUBLICATION_WEBHOOK_SECRET: secret },
  );
  assert.equal(result.status, 401);
});

test("Push batches at50 and retries only transient failed operations", async () => {
  const requests: SearchOperation[][] = [];
  let partial = true;
  const transport: typeof fetch = async (_url, init) => {
    const operations: SearchOperation[] = JSON.parse(
      String(init?.body),
    ).operations;
    requests.push(operations);
    const response = Response.json(
      {
        results: operations.map((operation, index) => ({
          index,
          action: operation.action,
          succeeded: !partial || index !== 0,
          statusCode: partial && index === 0 ? 429 : 200,
        })),
      },
      { status: partial ? 207 : 200 },
    );
    partial = false;
    return response;
  };
  const writer = new SearchPush(
    "https://edge-platform.sitecorecloud.io/op/97eea84c-ac47-4d91-7e4f-08defdaaa7df/search/search-ingestion",
    sourceId,
    "test-key",
    transport,
    async () => {},
  );
  const one = searchDocument(mapPublishedResource(resource(), origin));
  assert.equal(
    await writer.push(
      Array.from({ length: 51 }, (_, index) => ({
        ...one,
        id: `resource-${index}`,
      })),
    ),
    51,
  );
  assert.deepEqual(
    requests.map((request) => request.length),
    [50, 1, 1],
  );
});
