"use strict";
const assert = require("node:assert/strict");
const model = require("../../examples/liberty-mutual-agent-portal/src/data/resource-metadata-model.json");
const norm = (id) => {
  assert(typeof id === "string" && /^(?:[a-f\d]{32}|\{?[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\}?)$/i.test(id), "Invalid native metadata ID.");
  return id.replace(/[{}-]/g, "").toLowerCase();
};
function asGuid(id) { const s = norm(id).toUpperCase(); return `{${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}}`; }
function checklistValue(name, raw, choices) {
  assert(typeof raw === "string" && Array.isArray(choices) && choices.length > 0, "Read the actual managed choices before converting metadata.");
  const byName = new Map(), byId = new Map();
  for (const choice of choices) { const id = norm(choice.id); assert(typeof choice.value === "string" && !byName.has(choice.value) && !byId.has(id), "Duplicate managed choice."); byName.set(choice.value, choice); byId.set(id, choice); }
  if (!raw.trim()) return "";
  const selected = new Set();
  for (const token of raw.split(/[|,\r\n]+/).map((s) => s.trim()).filter(Boolean)) {
    const option = byName.get(token) || (/^[{a-f\d]/i.test(token) ? byId.get((() => { try { return norm(token); } catch { return ""; } })()) : undefined);
    const values = name === "product" && (token === "auto-home" || option?.value === "auto-home") ? ["auto", "home"] : option ? [option.value] : [];
    assert(values.length > 0, `Unknown ${name} value; preserve the authored value and review the managed taxonomy.`);
    for (const value of values) { assert(byName.has(value), "An individual product choice is missing."); selected.add(value); }
  }
  assert(name !== "state" || !selected.has("All") || selected.size === 1, "Select Cross-state guidance on its own or select specific states.");
  return choices.filter((option) => selected.has(option.value)).map((option) => asGuid(option.id)).join("|");
}
function planResourceChecklistChanges(fields, lists) {
  return model.fields.map((definition) => {
    const field = fields.find((entry) => norm(entry.fieldId) === norm(definition.fieldId));
    const list = lists.find((entry) => entry.field === definition.name);
    assert(field && field.name === definition.name && list && (list.path || list.source) === definition.sourcePath, "Resource metadata definition or managed list scope differs.");
    const value = checklistValue(definition.name, field.value, list.choices);
    return { fieldId: definition.fieldId, name: definition.name, before: field.value, value };
  }).filter((change) => change.before !== change.value);
}
module.exports = { checklistValue, planResourceChecklistChanges };
