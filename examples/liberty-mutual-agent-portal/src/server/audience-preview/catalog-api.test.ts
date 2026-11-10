import assert from "node:assert/strict";
import test, { before } from "node:test";
import { NextRequest } from "next/server";
process.env.SITECORE_EDGE_CONTEXT_ID = "catalog-synthetic-context";
let catalogPreparationHandlers: typeof import("./catalog-api").catalogPreparationHandlers;
const CATALOG_HOME_ID = "ae9e45ca-f127-4abe-9ca7-2ff109981998";
before(async () => {
  ({ catalogPreparationHandlers } = await import("./catalog-api"));
});
const page = {
  id: CATALOG_HOME_ID,
  name: "Home",
  path: "/",
  contentPath:
    "/sitecore/content/LibertyMutual/liberty-mutual-agent-portal/Home",
  siteName: "liberty-mutual-agent-portal",
  language: "en",
  version: 1,
};
const progress = {
  status: "pending" as const,
  total: 42 as const,
  readyCount: 0,
  pendingCount: 42,
  failedCount: 0,
  phase: "planning" as const,
  retryAfterSeconds: 3 as const,
  message: "Preparing all audiences.",
};
function harness() {
  let operations = 0,
    authorizations = 0;
  const handlers = catalogPreparationHandlers({
    session: async () => ({
      user: { sub: "synthetic-actor" },
      accessToken: "private-delegated-token",
    }),
    limit: async () => undefined,
    authorize: async (input, token) => {
      authorizations++;
      assert.deepEqual(input, { pageId: CATALOG_HOME_ID, language: "en" });
      assert.equal(token, "private-delegated-token");
      return page;
    },
    read: async () => progress,
    advance: async () => {
      operations++;
      return progress;
    },
  });
  return {
    handlers,
    operations: () => operations,
    authorizations: () => authorizations,
  };
}
const post = (body: unknown, origin = "https://portal.example") =>
  new NextRequest("https://portal.example/api/audience-preview/prepare", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("the fixed operation authorizes only Home and exposes safe progress", async () => {
  const run = harness();
  const response = await run.handlers.POST(post({}));
  assert.equal(response.status, 202);
  assert.equal(run.operations(), 1);
  assert.equal(run.authorizations(), 1);
  assert.equal(response.headers.get("Retry-After"), "3");
  assert.deepEqual(await response.json(), progress);
  assert.match(response.headers.get("Cache-Control")!, /no-store/);
  await run.handlers.GET(
    new NextRequest("https://portal.example/api/audience-preview/prepare"),
  );
  assert.equal(run.operations(), 1);
  assert.equal(run.authorizations(), 2);
});

test("cross-origin, page overrides and scenario overrides never advance preparation", async () => {
  const run = harness();
  assert.equal(
    (await run.handlers.POST(post({}, "https://other.example"))).status,
    403,
  );
  for (const body of [
    { pageId: CATALOG_HOME_ID },
    { scenarios: [] },
    { force: true },
    [],
  ])
    assert.equal((await run.handlers.POST(post(body))).status, 400);
  assert.equal(run.operations(), 0);
  assert.equal(
    (
      await run.handlers.GET(
        new NextRequest(
          "https://portal.example/api/audience-preview/prepare?pageId=other",
        ),
      )
    ).status,
    400,
  );
});
