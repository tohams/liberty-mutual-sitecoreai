"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { specifications, MODEL, SEED } = require("./provision-public-taxonomy.cjs");
const contract = require("../items/liberty-mutual-public/public-contract.json");

test("managed public choices are scoped to three author-owned lists and preserve indexed values", () => {
  const specs = specifications();
  assert.equal(specs.length, SEED.lists.reduce((total, list) => total + list.options.length + 1, 0));
  assert(specs.every((item) => item.path.startsWith(MODEL.taxonomyRoot + "/")));
  assert(specs.every((item) => [MODEL.folderTemplateId, MODEL.optionTemplateId].includes(item.template)));
  assert(specs.every((item) => item.fields.every((field) => !["Type", "Source", "__Workflow", "__Workflow state", "__Renderings", "__Final Renderings"].includes(field.name))));
  for (const name of ["PublicPage", "PublicApprovedAnswer"]) {
    const items = contract.records.filter((item) => item.template === contract.templateIds[name]);
    for (const list of SEED.lists) {
      const allowed = new Set(list.options.map((option) => option.value));
      for (const item of items) if (item.fields[list.field]) assert(allowed.has(item.fields[list.field]), `Missing existing ${list.field}: ${item.fields[list.field]}`);
    }
  }
});
test("public state choices use unambiguous state codes and an explicit national value", () => {
  const states = SEED.lists.find((list) => list.field === "state").options;
  assert.equal(states.length, 52);
  for (const required of ["All", "FL", "IL", "TX", "OR", "DC"]) assert(states.some((option) => option.value === required));
  assert.equal(new Set(states.map((option) => option.label)).size, states.length);
});
