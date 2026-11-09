"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { specifications, MODEL, SEED } = require("./provision-public-taxonomy.cjs");
const contract = require("../items/liberty-mutual-public/public-contract.json");
const identities = require("../items/liberty-mutual-public/public-site-identities.json");
const { atomicValues } = require("./public-checklist-values.cjs");

test("managed public choices are scoped to three author-owned lists and preserve indexed values", () => {
  const specs = specifications();
  assert.equal(specs.length, SEED.lists.reduce((total, list) => total + list.options.length + 1, 0));
  assert(specs.every((item) => item.path.startsWith(MODEL.taxonomyRoot + "/")));
  assert(specs.every((item) => [MODEL.folderTemplateId, MODEL.optionTemplateId].includes(item.template)));
  assert(specs.every((item) => item.fields.every((field) => !["Type", "Source", "__Workflow", "__Workflow state", "__Renderings", "__Final Renderings"].includes(field.name))));
  for (const name of ["PublicPage", "PublicResourcePage"]) {
    const items = contract.records.filter((item) => item.template === contract.templateIds[name]);
    for (const list of SEED.lists) {
      // CreateOnly snapshots use the same captured native identities as the
      // managed choices; ordinary deployments never apply editorial snapshots.
      const choices = list.options.map((option) => ({ ...option, id: identities[`${SEED.root}/${list.folder}/${option.value}`] }));
      for (const item of items) if (item.fields[list.field]) assert(atomicValues(list.field, item.fields[list.field], choices).length, `Missing existing ${list.field}: ${item.fields[list.field]}`);
    }
  }
});
test("public checklists use the existing field IDs and native managed source folders", () => {
  for (const kind of ["page"]) for (const definition of MODEL.fields[kind]) {
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
