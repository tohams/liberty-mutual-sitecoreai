"use strict";

/** Pure conversion for the public site's native taxonomy checklists.
 * Read actual native choices before planning; this module never logs in, writes,
 * publishes, or supplies a default classification for blank authored fields.
 */
const assert = require("node:assert/strict");
const MODEL = require("../../examples/liberty-mutual-agent-portal/src/data/public-metadata-model.json");
const COMBINATIONS = Object.freeze({
  "auto-home": ["auto", "home"],
  "auto-condo": ["auto", "condo"],
  "auto-renters": ["auto", "renters"],
});
const HELP = Object.freeze({
  state: "Select every state covered by this content, or All states on its own.",
  product: "Select every product covered by this content, or All products on its own.",
  audience: "Select the audiences for this content. All consumers includes prospective and existing customers.",
});
const normalizedId = (id) => {
  assert(typeof id === "string" && /^(?:[a-f\d]{32}|\{?[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\}?)$/i.test(id), "A managed choice has an invalid native ID.");
  return id.replace(/[{}-]/g, "").toLowerCase();
};
const asGuid = (id) => {
  const v = normalizedId(id).toUpperCase();
  return `{${v.slice(0, 8)}-${v.slice(8, 12)}-${v.slice(12, 16)}-${v.slice(16, 20)}-${v.slice(20)}}`;
};

function atomicValues(field, raw, choices) {
  assert(["state", "product", "audience"].includes(field), "Unknown public checklist field.");
  assert(typeof raw === "string", "Checklist source value must be text.");
  assert(Array.isArray(choices) && choices.length > 0 && choices.length <= 100, "Read the complete managed choices before converting metadata.");
  const byName = new Map(), byId = new Map();
  for (const choice of choices) {
    assert(choice && typeof choice.value === "string" && /^[A-Za-z][A-Za-z0-9-]*$/.test(choice.value), "A managed choice has an invalid stable value.");
    const key = choice.value.toLowerCase(), id = normalizedId(choice.id);
    assert(!byName.has(key) && !byId.has(id), "Managed choice values and IDs must be unique.");
    byName.set(key, choice); byId.set(id, choice);
  }
  if (!raw.trim()) return [];
  const input = raw.split(/[|,\r\n]+/).map((s) => s.trim()).filter(Boolean);
  assert(input.length > 0 && input.length <= 100, "Invalid checklist selection.");
  const result = new Set();
  for (const token of input) {
    const isId = /^(?:[a-f\d]{32}|\{?[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\}?)$/i.test(token);
    const choice = isId ? byId.get(normalizedId(token)) : byName.get(token.toLowerCase());
    const retiredCombination = !isId && field === "product" && COMBINATIONS[token.toLowerCase()];
    assert(choice || retiredCombination, `Unknown ${field} choice; preserve the source and review its managed taxonomy.`);
    const values = retiredCombination || (field === "product" && COMBINATIONS[choice.value]) || [choice.value];
    for (const value of values) {
      assert(byName.has(value.toLowerCase()), "A former product combination is missing an individual managed choice.");
      result.add(byName.get(value.toLowerCase()).value);
    }
  }
  if (field === "state") assert(!result.has("All") || result.size === 1, "Select All states on its own, or select specific states.");
  if (field === "product") assert(!result.has("all") || result.size === 1, "Select All products on its own, or select specific products.");
  if (field === "audience") assert(!result.has("consumer") || (!result.has("customer") && !result.has("prospective-customer")), "All consumers already includes existing and prospective customers.");
  return choices.filter((choice) => result.has(choice.value)).map((choice) => choice.value);
}

function checklistValue(field, raw, choices) {
  const selected = new Set(atomicValues(field, raw, choices));
  return choices.filter((choice) => selected.has(choice.value)).map((choice) => asGuid(choice.id)).join("|");
}

/** Plan only the three owned fields. Root caller owns item/version/concurrency checks. */
function planMetadataChanges(kind, fields, lists) {
  const definitions = MODEL.fields[kind === "resource" ? "page" : kind];
  assert(definitions && Array.isArray(fields) && Array.isArray(lists), "Provide a page or resource native field snapshot and its current managed choices.");
  return definitions.map((definition) => {
    const field = fields.find((entry) => normalizedId(entry.fieldId) === normalizedId(definition.fieldId));
    const list = lists.find((entry) => entry.field === definition.name);
    assert(field && field.name === definition.name && list && list.path === definition.sourcePath, "The native metadata definition or taxonomy scope differs.");
    const value = checklistValue(definition.name, field.value, list.choices);
    return { fieldId: definition.fieldId, name: definition.name, before: field.value, value };
  }).filter((change) => change.before !== change.value);
}

module.exports = { COMBINATIONS, HELP, atomicValues, checklistValue, planMetadataChanges };
