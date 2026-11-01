"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const S = require("./public-approve-initial-seed.cjs");
const W = require("./public-configure-editorial-workflow.cjs");

function item(state = W.IDS.draft) {
  return {
    itemId: "0123456789abcdef0123456789abcdef",
    path: "/sitecore/content/LibertyMutual/liberty-mutual-public-site/Home",
    version: 1,
    template: { templateId: "1234567890abcdef1234567890abcdef" },
    versions: [{ version: 1, language: { name: "en" } }],
    fields: [
      { fieldId: "a", name: "__Workflow state", value: state },
      { fieldId: "b", name: "heading", value: "Approved copy" },
      { fieldId: "c", name: "__Lock", value: "<r />" },
      { fieldId: "d", name: "__Owner", value: "sitecore\\existing" },
      { fieldId: "e", name: "__Created by", value: "sitecore\\existing" },
    ],
  };
}

test("initial delivery scope contains exactly ten explicit items, no branch prototypes or temporary QA", () => {
  assert.equal(S.PATHS.length, 10);
  assert.equal(new Set(S.PATHS).size, 10);
  assert.equal(S.targets().length, 10);
  for (const path of S.PATHS)
    assert.doesNotMatch(
      path,
      /\$name|Authoring check|Page Branches|Approved answers/,
    );
  assert.match(S.MUTATION, /^mutation.*executeWorkflowCommand/);
  assert.doesNotMatch(S.MUTATION, /updateItem|publishItem|createItem/);
});

test("real workflow routes Draft through Submit and Approve, skips Approved, and rejects unknown states", () => {
  assert.equal(S.routeFor(W.IDS.draft).commandId, W.IDS.submit);
  assert.equal(S.routeFor(W.IDS.awaiting).commandId, W.IDS.approve);
  assert.equal(S.routeFor(W.IDS.approved), null);
  assert.throws(() => S.routeFor("unrecognized"), /unexpected/);
});

test("state verification tolerates a native lock release but rejects changes to authored copy, IDs, or owners", () => {
  const before = item();
  const after = item(W.IDS.awaiting);
  after.fields.find((f) => f.name === "__Lock").value = "";
  S.verifyTransition(before, after, W.IDS.awaiting, "sitecore\\setup");
  const copyChange = structuredClone(after);
  copyChange.fields.find((f) => f.name === "heading").value =
    "Unexpected rewrite";
  assert.throws(
    () =>
      S.verifyTransition(before, copyChange, W.IDS.awaiting, "sitecore\\setup"),
    /authored fields/,
  );
  const ownerChange = structuredClone(after);
  ownerChange.fields.find((f) => f.name === "__Owner").value =
    "sitecore\\setup";
  assert.throws(
    () =>
      S.verifyTransition(
        before,
        ownerChange,
        W.IDS.awaiting,
        "sitecore\\setup",
      ),
    /provenance/,
  );
  assert.throws(
    () =>
      S.verifyTransition(
        before,
        { ...after, itemId: "other" },
        W.IDS.awaiting,
        "sitecore\\setup",
      ),
    /readback/,
  );
});

test("a native command cannot assign an active lock or claim another resulting state", () => {
  const before = item();
  const after = item(W.IDS.awaiting);
  after.fields.find((f) => f.name === "__Lock").value =
    '<r owner="someone-else" />';
  assert.throws(
    () => S.verifyTransition(before, after, W.IDS.awaiting, "sitecore\\setup"),
    /lock/,
  );
  assert.throws(
    () =>
      S.verifyTransition(
        before,
        item(W.IDS.draft),
        W.IDS.awaiting,
        "sitecore\\setup",
      ),
    /readback/,
  );
});
