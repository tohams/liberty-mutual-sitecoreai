"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { specifications, MODEL, SEED } = require("./provision-public-taxonomy.cjs");
const contract = require("../items/liberty-mutual-public/public-contract.json");
const { atomicValues } = require("./public-checklist-values.cjs");

test("managed public choices are scoped to three author-owned lists and preserve indexed values", () => {
  const specs = specifications();
  assert.equal(specs.length, SEED.lists.reduce((total, list) => total + list.options.length + 1, 0));
  assert(specs.every((item) => item.path.startsWith(MODEL.taxonomyRoot + "/")));
  assert(specs.every((item) => [MODEL.folderTemplateId, MODEL.optionTemplateId].includes(item.template)));
  assert(specs.every((item) => item.fields.every((field) => !["Type", "Source", "__Workflow", "__Workflow state", "__Renderings", "__Final Renderings"].includes(field.name))));
  for (const name of ["PublicPage", "PublicApprovedAnswer"]) {
    const items = contract.records.filter((item) => item.template === contract.templateIds[name]);
    for (const list of SEED.lists) {
      // Historical CreateOnly snapshots are converted using actual current
      // native choices during explicit restoration, never ordinary deploys.
      const choices = list.options.map((option, index) => ({ ...option, id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` }));
      for (const item of items) if (item.fields[list.field]) assert(atomicValues(list.field, item.fields[list.field], choices).length, `Missing existing ${list.field}: ${item.fields[list.field]}`);
    }
  }
});
test("public checklists use the existing field IDs and native managed source folders", () => {
  for (const kind of ["page", "answer"]) for (const definition of MODEL.fields[kind]) {
    const field = contract.records.find((item) => item.id === definition.fieldId);
    assert(field && field.path === definition.definitionPath);
    assert.equal(field.fields.Type, "Checklist");
    assert.equal(field.fields.Source, definition.sourcePath);
  }
  assert(SEED.lists.find((list) => list.field === "product").options.every((option) => !["auto-home", "auto-condo", "auto-renters"].includes(option.value)));
});
test("public state choices use unambiguous state codes and an explicit national value", () => {
  const states = SEED.lists.find((list) => list.field === "state").options;
  assert.equal(states.length, 52);
  for (const required of ["All", "FL", "IL", "TX", "OR", "DC"]) assert(states.some((option) => option.value === required));
  assert.equal(new Set(states.map((option) => option.label)).size, states.length);
});
