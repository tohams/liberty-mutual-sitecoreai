"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const workflow = require("./public-configure-editorial-workflow.cjs");
const { mergeAcl, ROLES } = require("./workshop-editorial-workflow-model.cjs");

const base = path.resolve(__dirname, "../items/liberty-mutual-public");
const contract = JSON.parse(
  fs.readFileSync(path.join(base, "portal-relevance-contract.json"), "utf8"),
);

test("a restored agency-priority library grants the existing scoped editorial roles without changing other content ACLs", () => {
  const grants = contract.records.flatMap((item) =>
    (item.SharedFields || [])
      .filter((field) => field.Hint === "__Security")
      .map((field) => ({ item, value: field.Value })),
  );
  assert.equal(grants.length, 1);
  assert.equal(
    grants[0].item.ID,
    "19314938-5d93-57cc-b572-a548026d43dd",
  );
  assert.equal(grants[0].item.Path, contract.libraryPath);
  assert.equal(
    grants[0].value,
    mergeAcl("", [
      [ROLES.author, workflow.AUTHOR_CONTENT, workflow.AUTHOR_CONTENT],
      [ROLES.approver, workflow.APPROVER_CONTENT, workflow.APPROVER_CONTENT],
    ]),
  );
  assert.equal(workflow.AUTHOR_CONTENT["item:create"], true);
  assert.equal(workflow.APPROVER_CONTENT["item:create"], false);
  for (const rights of [workflow.AUTHOR_CONTENT, workflow.APPROVER_CONTENT]) {
    assert.equal(rights["item:delete"], false);
    assert.equal(rights["item:admin"], false);
  }
});

test("the editorial restoration module remains CreateOnly and is absent from ordinary deployment", () => {
  const module = JSON.parse(
    fs.readFileSync(
      path.join(base, "LibertyMutual.PortalRelevanceSeed.module.json"),
      "utf8",
    ),
  );
  assert.deepEqual(module.items.includes, [
    {
      name: "portal-relevance-seed",
      path: contract.libraryPath,
      allowedPushOperations: "CreateOnly",
    },
  ]);
  const deploy = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../xmcloud.build.json"), "utf8"),
  );
  assert.equal(
    JSON.stringify(deploy).includes("LibertyMutual.PortalRelevanceSeed"),
    false,
  );
});
