"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { atomicValues, checklistValue, planMetadataChanges } = require("./public-checklist-values.cjs");
const MODEL = require("../../examples/liberty-mutual-agent-portal/src/data/public-metadata-model.json");
const choices = (values) => values.map((value, i) => ({ value, id: `${String(i + 1).padStart(8, "0")}-0000-4000-8000-000000000001`, label: value }));
const products = choices(["all", "auto", "home", "condo", "renters", "auto-home", "auto-condo", "auto-renters", "small-business"]);

test("former product combinations become independent selections and support three products", () => {
  assert.deepEqual(atomicValues("product", "auto-home,auto-condo", products), ["auto", "home", "condo"]);
  assert.deepEqual(atomicValues("product", "auto-home", products.filter((x) => !x.value.startsWith("auto-"))), ["auto", "home"]);
  assert.deepEqual(atomicValues("product", "small-business", products), ["small-business"]);
  const encoded = checklistValue("product", "auto,home,condo", products);
  assert.equal(encoded.split("|").length, 3);
  assert.deepEqual(atomicValues("product", encoded, products), ["auto", "home", "condo"]);
  assert.equal(checklistValue("product", encoded, products), encoded);
});

test("existing reference selections are preserved and retired combination references expand", () => {
  assert.deepEqual(atomicValues("product", products.find((x) => x.value === "auto-home").id, products), ["auto", "home"]);
  assert.equal(checklistValue("product", "", products), "");
  assert.equal(checklistValue("product", "  ", products), "");
});

test("managed values never silently default or accept foreign references", () => {
  assert.throws(() => checklistValue("product", "unknown", products), /Unknown product choice/);
  assert.throws(() => checklistValue("product", "ffffffff-0000-4000-8000-000000000001", products), /Unknown product choice/);
  assert.throws(() => checklistValue("product", "auto-home", choices(["auto-home", "auto"])), /missing an individual/);
  assert.throws(() => checklistValue("product", "all,auto", products), /All products on its own/);
  assert.throws(() => checklistValue("state", "All,IL", choices(["All", "IL", "TX"])), /All states on its own/);
  assert.deepEqual(atomicValues("state", "TX,IL", choices(["All", "IL", "TX"])), ["IL", "TX"]);
});

test("audience subsets cannot redundantly include All consumers", () => {
  const audiences = choices(["consumer", "prospective-customer", "customer", "independent-agent"]);
  assert.throws(() => checklistValue("audience", "consumer,customer", audiences), /already includes/);
  assert.deepEqual(atomicValues("audience", "prospective-customer,customer", audiences), ["prospective-customer", "customer"]);
});

test("planning preserves unrelated page data and verifies the configured field IDs and list paths", () => {
  const lists = [
    { field: "state", choices: choices(["All", "IL", "TX"]) },
    { field: "product", choices: products },
    { field: "audience", choices: choices(["consumer", "customer"]) },
  ].map((list) => ({ ...list, path: MODEL.fields.page.find((field) => field.name === list.field).sourcePath }));
  const fields = MODEL.fields.page.map((field) => ({ fieldId: field.fieldId, name: field.name, value: { state: "All", product: "auto-home", audience: "consumer" }[field.name] }));
  fields.push({ fieldId: "ffffffff-0000-4000-8000-000000000001", name: "Title", value: "Preserve title" });
  const original = structuredClone(fields), changes = planMetadataChanges("page", fields, lists);
  assert.equal(changes.length, 3);
  assert(changes.every((change) => ["state", "product", "audience"].includes(change.name)));
  assert.deepEqual(fields, original);
  assert.throws(() => planMetadataChanges("page", fields, lists.map((list) => ({ ...list, path: "/other-site" }))), /scope differs/);
});


test("resource pages inherit the same native metadata definitions without a duplicate answer template", () => {
  assert.equal(MODEL.resourceRoot, MODEL.pageRoot + "/insurance-resources");
  assert.equal(MODEL.resourcePageTemplateId, "b99218ea-e1fd-41af-a4ae-7ec9e5c30b17");
  assert(!MODEL.answerRoot && !MODEL.answerTemplateId && !MODEL.fields.answer);
  const lists = MODEL.fields.page.map((field) => ({ field: field.name, path: field.sourcePath,
    choices: choices({ state: ["All", "TX"], product: ["auto", "home"], audience: ["consumer"] }[field.name]) }));
  const fields = MODEL.fields.page.map((field) => ({ fieldId: field.fieldId, name: field.name,
    value: { state: "TX", product: "auto-home", audience: "consumer" }[field.name] }));
  assert.deepEqual(planMetadataChanges("resource", fields, lists), planMetadataChanges("page", fields, lists));
});
