"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const L = require("./public-approve-logo-revision.cjs");
const W = require("./public-configure-editorial-workflow.cjs");
const actor = "sitecore\\setup";
const start = {
  cursor: "MA==",
  node: {
    date: "2026-11-01T00:00:00Z",
    user: actor,
    newState: { stateId: W.IDS.draft, displayName: "Draft" },
  },
};
const transition = {
  date: "2026-11-01T00:01:00Z",
  user: actor,
  oldState: { stateId: W.IDS.draft, displayName: "Draft" },
  newState: { stateId: W.IDS.awaiting, displayName: "Awaiting approval" },
};
function transport(events, transitions) {
  let call = 0;
  return async (query, variables) => {
    assert.equal(variables.item.version, 2);
    if (call++ === 0) {
      assert.equal(query, L.INVENTORY);
      assert.doesNotMatch(query, /oldState/);
      return {
        workflow: {
          workflowId: W.IDS.workflow,
          commands: { nodes: [], pageInfo: { hasNextPage: false } },
          history: { edges: events, pageInfo: { hasNextPage: false } },
        },
      };
    }
    assert.equal(query, L.TRANSITIONS);
    assert.equal(variables.after, "MA==");
    assert.match(query, /oldState/);
    return {
      workflow: {
        history: { nodes: transitions, pageInfo: { hasNextPage: false } },
      },
    };
  };
}
test("logo approval scope is exactly Header/Footer, separate from version-1 seed helper", () => {
  assert.equal(L.TARGETS.length, 2);
  for (const item of L.TARGETS)
    assert.match(
      item.path,
      /Partial Designs\/(Header|Footer)\/Data\/(Header|Footer)$/,
    );
});
test("native version-start history is inventoried without asking for its nonexistent old state", async () => {
  const result = await L.details(transport([start], []), {
    itemId: "header",
    version: 2,
  });
  assert.deepEqual(result.versionStarted, start);
  assert.deepEqual(result.history, []);
  await assert.rejects(
    () => L.details(transport([start], []), { itemId: "header", version: 1 }),
    /second logo/,
  );
});
test("every subsequent native event retains full old/new state proof and no event can be silently dropped", async () => {
  const { oldState, ...summary } = transition;
  assert.ok(oldState);
  const events = [start, { cursor: "MQ==", node: summary }];
  const result = await L.details(transport(events, [transition]), {
    itemId: "header",
    version: 2,
  });
  assert.deepEqual(result.history, [transition]);
  await assert.rejects(
    () => L.details(transport(events, []), { itemId: "header", version: 2 }),
    /all subsequent/,
  );
  await assert.rejects(
    () =>
      L.details(transport([{ ...start, node: summary }], []), {
        itemId: "header",
        version: 2,
      }),
    /version-start/,
  );
});
