#!/usr/bin/env node
"use strict";

/** Explicit, additive author-managed metadata lists. Default is read-only.
 * --apply creates missing list folders/options, preserves existing author values,
 * and never changes templates, field types, pages, workflows, or publication.
 * Usage: node authoring/scripts/provision-public-taxonomy.cjs demo
 *        --report /absolute/private/public-taxonomy.json [--apply]
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { connection, read, value, writePrivate, ROOT } = require("./campaign-native-client.cjs");
const MODEL = require("../../examples/liberty-mutual-agent-portal/src/data/public-metadata-model.json");
const SEED = require("../items/liberty-mutual-public/public-taxonomy.json");
const CREATE = "mutation($input:CreateItemInput!){createItem(input:$input){item{itemId path}}}";
const norm = (id) => String(id).replace(/[{}-]/g, "").toLowerCase();

function specifications() {
  assert.equal(SEED.schemaVersion, 1);
  assert.equal(SEED.root, MODEL.taxonomyRoot);
  assert.equal(SEED.root, "/sitecore/content/LibertyMutual/liberty-mutual-public-site/Data/Taxonomy");
  assert.equal(SEED.lists.length, 3);
  const result = [];
  for (const list of SEED.lists) {
    const definition = MODEL.fields.page.find((field) => field.name === list.field);
    assert(definition && definition.sourcePath === `${SEED.root}/${list.folder}`);
    assert(/^[A-Za-z ]+$/.test(list.folder));
    assert(Array.isArray(list.options) && list.options.length > 0 && list.options.length <= 100);
    assert.equal(new Set(list.options.map((option) => option.value)).size, list.options.length);
    result.push({ path: definition.sourcePath, parent: SEED.root, template: MODEL.folderTemplateId,
      fields: [{ name: "__Masters", value: `{${MODEL.optionTemplateId.toUpperCase()}}` }, { name: "__Display name", value: list.folder }] });
    for (const [index, option] of list.options.entries()) {
      assert(typeof option.value === "string" && /^[A-Za-z][A-Za-z0-9-]*$/.test(option.value));
      assert(typeof option.label === "string" && option.label.trim() && typeof option.description === "string");
      result.push({ path: `${definition.sourcePath}/${option.value}`, parent: definition.sourcePath, template: MODEL.optionTemplateId,
        fields: [{ name: "__Display name", value: option.label }, { name: "description", value: option.description }, { name: "__Sortorder", value: String((index + 1) * 100) }] });
    }
  }
  assert.equal(new Set(result.map((item) => item.path)).size, result.length);
  assert(result.every((item) => item.path.startsWith(SEED.root + "/") && item.path.split("/").length <= SEED.root.split("/").length + 2));
  return result;
}
function identity(item, spec) {
  assert(item && item.path === spec.path && item.parent.path === spec.parent && norm(item.template.templateId) === norm(spec.template),
    "A managed list path, parent, or template differs. Preserve the existing item and review it.");
}
async function preflight(query, specs) {
  const root = await read(query, { path: SEED.root });
  assert(root && norm(root.itemId) === norm(MODEL.taxonomyRootId), "The public taxonomy root does not match the configured site.");
  for (const id of [MODEL.folderTemplateId, MODEL.optionTemplateId]) assert(await read(query, { itemId: id }), "The shared managed-choice templates must be deployed first.");
  const description = await read(query, { itemId: MODEL.descriptionFieldId });
  assert(description && description.name === "description" && value(description, "Type") === "Multi-Line Text", "The managed option description field differs.");
  for (const definition of [...MODEL.fields.page, ...MODEL.fields.answer]) {
    const field = await read(query, { itemId: definition.fieldId });
    assert(field && field.path === definition.definitionPath && field.name === definition.name && value(field, "Type") === "Single-Line Text" &&
      ["", "0"].includes(value(field, "Shared")) && ["", "0"].includes(value(field, "Unversioned")),
    "Public metadata must retain its native versioned Single-Line Text contract. No changes were made.");
  }
  const items = [];
  for (const spec of specs) {
    const item = await read(query, { path: spec.path });
    if (item) identity(item, spec);
    items.push({ spec, item });
  }
  return { root, items };
}
async function run(args) {
  const apply = args.includes("--apply"), environment = args.find((arg) => !arg.startsWith("--")) || "demo";
  const reportIndex = args.indexOf("--report"), report = reportIndex >= 0 ? args[reportIndex + 1] : "";
  assert(/^[A-Za-z0-9_-]+$/.test(environment), "Provide a configured CLI environment name.");
  assert(report && path.isAbsolute(report) && !report.startsWith(ROOT + path.sep), "Provide --report as a private absolute path outside the repository.");
  assert(!fs.existsSync(report), "Use a new private report filename; preserve earlier evidence.");
  const specs = specifications(), { query } = connection(environment, apply), baseline = await preflight(query, specs);
  const history = { startedAt: new Date().toISOString(), environment, apply, root: baseline.root,
    before: baseline.items, operations: [], after: [], completed: false };
  const record = () => writePrivate(report, history);
  record();
  if (!apply) {
    history.operations = baseline.items.map(({ spec, item }) => ({ path: spec.path, action: item ? "preserve" : "would-create" }));
    history.completed = true; record();
    console.log(JSON.stringify({ apply: false, create: history.operations.filter((entry) => entry.action === "would-create").length,
      preserve: history.operations.filter((entry) => entry.action === "preserve").length }));
    return;
  }
  for (const { spec, item: previous } of baseline.items) {
    const current = await read(query, { path: spec.path });
    if (current) {
      identity(current, spec);
      assert(!previous || norm(previous.itemId) === norm(current.itemId), "A managed choice was replaced after preflight; review before continuing.");
      history.operations.push({ path: spec.path, itemId: current.itemId, action: "preserve" }); record();
      continue;
    }
    assert(!previous, "A previous managed choice was deleted after preflight; do not recreate it.");
    const parent = await read(query, { path: spec.parent });
    assert(parent && (spec.parent === SEED.root ? norm(parent.itemId) === norm(MODEL.taxonomyRootId) : norm(parent.template.templateId) === norm(MODEL.folderTemplateId)), "The managed-choice parent is missing or changed.");
    history.operations.push({ path: spec.path, action: "create-intent" }); record();
    const result = await query(CREATE, { input: { database: "master", language: "en", parent: parent.itemId,
      templateId: spec.template, name: spec.path.split("/").at(-1), fields: spec.fields } });
    assert(result.createItem?.item?.itemId, "Creation was not confirmed. Inspect the private report before retrying.");
    const created = await read(query, { itemId: result.createItem.item.itemId });
    identity(created, spec);
    assert(spec.fields.every((field) => value(created, field.name) === field.value), "The new managed-choice fields differ from the creation plan.");
    history.operations.push({ path: spec.path, itemId: created.itemId, action: "created" }); record();
  }
  for (const spec of specs) { const item = await read(query, { path: spec.path }); identity(item, spec); history.after.push(item); }
  history.completed = true; history.completedAt = new Date().toISOString(); record();
  console.log(JSON.stringify({ apply: true, created: history.operations.filter((entry) => entry.action === "created").length,
    preserved: history.operations.filter((entry) => entry.action === "preserve").length, verified: history.after.length }));
}
if (require.main === module) run(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { specifications, preflight, MODEL, SEED };
