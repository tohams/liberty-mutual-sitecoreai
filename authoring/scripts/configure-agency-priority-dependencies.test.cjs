"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { planned, DEPENDENCIES } = require("./configure-agency-priority-dependencies.cjs");
const model = require("../items/liberty-mutual-public/public-contract.json");
function rendering(value, second = value) {
  return {
    itemId: "a2e85f2d-7dbc-5640-8040-0b688d7912a6",
    path: "/sitecore/layout/Renderings/Project/LibertyMutualPublic/AgencyPriorities",
    versions: [value, second].map((selection) => ({ fields: [{ fieldId: "b4bbc0be-7619-4678-b2f7-947d84aa77a9", name: "Content Dependencies", value: selection }] })),
  };
}
test("dependency plan preserves existing native options and appends missing peer and linked-item dependencies once", () => {
  const children = "{B0B5B0CD-6445-4FAE-A989-6CA9C50CC29A}";
  const existing = children + "|" + DEPENDENCIES[0].toLowerCase();
  const result = planned(rendering(existing));
  assert.equal(result.before, existing);
  assert.equal(result.after, existing + "|" + DEPENDENCIES.slice(1).join("|"));
  assert.equal(planned(rendering(result.after)).after, result.after);
  assert.deepEqual(planned(rendering("")).after.split("|"), DEPENDENCIES);
});
test("dependency plan refuses another rendering, malformed selections, or inconsistent shared values", () => {
  assert.throws(() => planned({ ...rendering(""), itemId: "wrong" }));
  assert.throws(() => planned({ ...rendering(""), path: "/another/rendering" }));
  assert.throws(() => planned(rendering("unrecognized-text")));
  assert.throws(() => planned(rendering(DEPENDENCIES[0], "")));
});
test("generated rendering source retains the reviewed three native dependency IDs", () => {
  const record = model.records.find((item) => item.path === rendering("").path);
  assert.deepEqual(record.fields["Content Dependencies"].split("|"), DEPENDENCIES);
});
