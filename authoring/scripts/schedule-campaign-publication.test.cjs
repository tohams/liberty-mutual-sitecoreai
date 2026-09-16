const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("./campaign-authoring-model.cjs");
const S = require("./schedule-campaign-publication.cjs");
const now = Date.parse("2026-09-16T15:00:00Z");
const window = () =>
  S.scheduleWindow("2026-09-16T15:01:00Z", "2026-09-16T15:04:00Z", now);
function fixture() {
  const items = S.specs(window()).map((s, n) => ({
    ...s,
    itemId: "00000000-0000-4000-8000-" + String(n + 1).padStart(12, "0"),
  }));
  const calls = [];
  const query = async (q, v) => {
    calls.push({ q, v });
    if (q.includes("item(where:")) {
      const spec = items.find((i) => i.path === v.where.path);
      return {
        item: spec
          ? {
              itemId: spec.itemId,
              name: spec.path.split("/").at(-1),
              path: spec.path,
              version: 1,
              language: { name: "en" },
              parent: { itemId: "parent", path: spec.parent },
              template: { templateId: spec.template, name: "Campaign" },
              revision: { value: "r1" },
              versions: [{ version: 1, language: { name: "en" } }],
              children: {
                nodes: items
                  .filter((item) => item.parent === spec.path)
                  .map((item) => ({
                    itemId: item.itemId,
                    path: item.path,
                  }))
                  .concat(spec.extraChildren ?? []),
                pageInfo: { hasNextPage: false },
              },
              fields: {
                nodes: spec.fields.map((f, n) => ({
                  ...f,
                  fieldId: "field-" + n,
                })),
                pageInfo: { hasNextPage: false },
              },
            }
          : null,
      };
    }
    if (q.includes("publishingTargets"))
      return {
        publishingTargets: [
          {
            name: "Edge",
            targetDatabase: "experienceedge",
            previewPublishingTarget: false,
          },
        ],
      };
    if (q.includes("publishItem(input:"))
      return { publishItem: { operationId: "operation-one" } };
    if (q.includes("publishingStatus"))
      return {
        publishingStatus: {
          isDone: true,
          isFailed: false,
          state: "FINISHED",
          processed: 9,
        },
      };
    throw Error("Unexpected query");
  };
  return {
    items,
    calls,
    query,
    journal: {
      phase: "prepared",
      window: window(),
      items: structuredClone(items),
    },
  };
}

test("bounded proof rejects ambiguous timezone, near/impossible dates and long-lived schedules", () => {
  assert.equal(window().nativeStart, "20260916T150100Z");
  assert.throws(() =>
    S.scheduleWindow("2026-09-16T15:01:00", "2026-09-16T15:04:00Z", now),
  );
  assert.throws(() =>
    S.scheduleWindow("2026-09-16T15:00:05Z", "2026-09-16T15:04:00Z", now),
  );
  assert.throws(() =>
    S.scheduleWindow("2026-09-16T15:01:00Z", "2026-09-16T15:01:20Z", now),
  );
  assert.throws(() =>
    S.scheduleWindow("2026-09-16T15:01:00Z", "2026-09-16T16:00:00Z", now),
  );
});

test("publish and expiration boundaries include only the independent scheduled page subtree", async () => {
  const f = fixture();
  await S.executeBoundary(f.query, f.journal, "publish", () => {});
  await S.executeBoundary(f.query, f.journal, "expire", () => {});
  const mutations = f.calls.filter((c) => c.q.includes("publishItem(input:"));
  assert.equal(mutations.length, 2);
  for (const { v } of mutations) {
    assert.equal(v.input.rootItemId, f.items[0].itemId);
    assert.equal(v.input.publishRelatedItems, false);
    assert.equal(v.input.publishSubItems, true);
    assert.deepEqual(v.input.targetDatabases, ["experienceedge"]);
    assert(!v.input.rootItemPaths);
  }
  assert(
    f.journal.operations.publish.complete &&
      f.journal.operations.expire.complete,
  );
});

test("completed boundary is idempotent and uncertain submission is not retried", async () => {
  const f = fixture();
  await S.executeBoundary(f.query, f.journal, "publish", () => {});
  await S.executeBoundary(f.query, f.journal, "publish", () => {});
  assert.equal(
    f.calls.filter((c) => c.q.includes("publishItem(input:")).length,
    1,
  );
  f.journal.operations.expire = { status: "submitting" };
  await assert.rejects(
    S.executeBoundary(f.query, f.journal, "expire", () => {}),
    /uncertain/,
  );
  assert.equal(
    f.calls.filter((c) => c.q.includes("publishItem(input:")).length,
    1,
  );
});

test("changed authored content or out-of-scope receipt stops before publishing", async () => {
  const f = fixture();
  f.items[0].fields.find((x) => x.name === "Title").value =
    "An author changed this";
  await assert.rejects(
    S.executeBoundary(f.query, f.journal, "publish", () => {}),
    /changed/,
  );
  assert.equal(
    f.calls.some((c) => c.q.startsWith("mutation")),
    false,
  );
  const other = fixture();
  other.journal.items[0].path = M.PAGE;
  await assert.rejects(
    S.executeBoundary(other.query, other.journal, "publish", () => {}),
    /Wrong scheduling receipt/,
  );
  assert.equal(
    other.calls.some((c) => c.q.startsWith("mutation")),
    false,
  );
});

test("every scheduled local datasource has the same expiration and one bounded page parent", () => {
  const specs = S.specs(window());
  assert.equal(specs.length, 9);
  for (const spec of specs) {
    assert(
      spec.path === S.SCHEDULE_PATH ||
        spec.path.startsWith(S.SCHEDULE_PATH + "/Data"),
    );
    assert(
      spec.fields.some(
        (f) => f.name === "__Valid to" && f.value === window().nativeEnd,
      ),
    );
  }
});

test("an unrecorded child stops subtree publication before any mutation", async () => {
  const f = fixture();
  f.items.find((item) => item.path.endsWith("/Data")).extraChildren = [
    {
      itemId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      path: S.SCHEDULE_PATH + "/Data/Unreviewed content",
    },
  ];
  await assert.rejects(
    S.executeBoundary(f.query, f.journal, "publish", () => {}),
    /child inventory changed/,
  );
  assert.equal(
    f.calls.some((call) => call.q.startsWith("mutation")),
    false,
  );
});
