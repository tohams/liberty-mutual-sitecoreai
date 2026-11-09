"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { checklistValue, planResourceChecklistChanges } = require("./portal-checklist-values.cjs");
const model = require("../../examples/liberty-mutual-agent-portal/src/data/resource-metadata-model.json");
const options = require("../../examples/liberty-mutual-agent-portal/src/data/resource-taxonomy-options.json");
test("Portal native checklist migration preserves IDs, blanks, and individual values", () => {
  const selected = checklistValue("product", "auto-home", options.product);
  assert(selected.includes(options.product.find((option) => option.value === "auto").id.toUpperCase()));
  assert(selected.includes(options.product.find((option) => option.value === "home").id.toUpperCase()));
  assert.equal(selected.split("|").length, 2);
  assert.equal(checklistValue("product", selected, options.product), selected);
  assert.equal(checklistValue("state", "", options.state), "");
  assert.equal(checklistValue("state", "IL,TX,FL", options.state).split("|").length, 3);
  assert.throws(() => checklistValue("state", "All,TX", options.state), /Cross-state guidance/);
  assert.throws(() => checklistValue("state", "CA", options.state), /Unknown state/);
});
test("the migration plan changes only the five verified metadata fields", () => {
  const initial = { state: "TX", businessFamily: "small-commercial", product: "workers-compensation", channel: "independent-agent", resourceType: "State guidance" };
  const fields = model.fields.map((field) => ({ fieldId: field.fieldId, name: field.name, value: initial[field.name] }));
  fields.push({ fieldId: "11111111-2222-4333-8444-555555555555", name: "Title", value: "Keep this title" });
  const lists = model.fields.map((field) => ({ field: field.name, path: field.sourcePath, choices: options[field.name] }));
  const before = structuredClone(fields), changes = planResourceChecklistChanges(fields, lists);
  assert.equal(changes.length, 5);
  assert(changes.every((change) => model.fields.some((field) => field.fieldId === change.fieldId)));
  assert.deepEqual(fields, before);
  assert.throws(() => planResourceChecklistChanges(fields, lists.map((list) => ({ ...list, path: "/another-site" }))), /scope differs/);
});
