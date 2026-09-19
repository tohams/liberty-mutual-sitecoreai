#!/usr/bin/env node
"use strict";

/**
 * Create-only workshop practice pages. Default is read-only; never publishes,
 * changes workflow definitions, updates templates, or overwrites author edits.
 * Native createItem generates IDs; the external manifest records each ID before
 * the next write. All operations are restricted to 28 declared paths.
 *
 * Review: ... demo --template-manifest /absolute/private/practice-template.json
 * Apply:  ... demo --template-manifest /absolute/private/practice-template.json --apply --manifest /absolute/private/practice-content.json
 * Repeat: ... demo --template-manifest /absolute/private/practice-template.json --manifest /absolute/private/practice-content.json
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { connection, read, value, writePrivate, ROOT } = require("./campaign-native-client.cjs");
const R = require("./resource-page-authoring-model.cjs");
const W = require("./workshop-editorial-workflow-model.cjs");
const M = require("./workshop-practice-content-model.cjs");
const T = require("./configure-workshop-practice-template.cjs");
const CREATE = "mutation($input:CreateItemInput!){createItem(input:$input){item{itemId}}}";
const UPDATE = "mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}";
const DISCOVERY = Object.freeze({
  portalNavigation: "No navigation items or links are created.",
  searchMetadata: "State is All for normal licensed access; other resource facets are blank.",
  nativeSearch: "WorkshopPracticePage directly inherits PortalPage, not the ResourcePage template indexed by Liberty Mutual Agent Resources. Verify exclusion after publishing and reindexing.",
});

function identity(item, spec, recorded) {
  M.assertTarget(spec, spec.templateId);
  assert(item && item.path === spec.path && R.norm(item.template.templateId) === R.norm(spec.templateId), "Practice item path or template differs.");
  assert(item.parent.path === spec.parentPath && value(item, "__Short description") === M.MARKER, "Practice item parent or ownership marker differs.");
  assert(recorded && M.validId(recorded.itemId) && R.norm(recorded.itemId) === R.norm(item.itemId), "Existing practice content requires its recorded manifest ID; never adopt an unrelated item.");
}
function assertFields(item, fields) {
  for (const [name, expected] of Object.entries(fields)) assert(value(item, name) === expected, `Practice item ${name} readback differs from its create plan.`);
}
function emptyLock(item) {
  const lock = value(item, "__Lock").trim();
  assert(!lock || /^<r\s*\/\s*>$/.test(lock), "The practice item is locked; preserve the author's work.");
}
async function workflowIds(query) {
  const result = {}, missing = [];
  for (const key of ["workflow", "draft", "awaiting", "approved"]) {
    const item = await read(query, { path: W.PATHS[key] });
    if (!item) { missing.push(W.PATHS[key]); continue; }
    const template = key === "workflow" ? W.TEMPLATES.workflow : W.TEMPLATES.state;
    assert(item.path === W.PATHS[key] && R.norm(item.template.templateId) === R.norm(template), "Workshop workflow identity differs.");
    if (key === "workflow") assert(value(item, "__Short description") === W.MARKER, "Workshop workflow is not owned by this setup.");
    else assert(value(item, "Final") === (key === "approved" ? "1" : ""), "Workshop workflow final-state configuration differs.");
    result[key + "Id"] = item.itemId;
  }
  return { ids: missing.length ? null : result, missing };
}
async function preflight(query) {
  const home = await read(query, { path: W.SITE + "/Home" });
  assert(home && R.norm(home.itemId) === "ae9e45caf1274abe9ca72ff109981998", "Unexpected site Home item; no writes permitted.");
  for (const [name, id] of Object.entries(M.TITLE_FIELDS)) {
    const definition = await read(query, { itemId: id });
    assert(definition && definition.name === name && !value(definition, "Shared") && !value(definition, "Unversioned"), "Workshop edits must use native versioned Title, summary and body fields.");
  }
  const prototype = await read(query, { itemId: R.IDS.prototype });
  assert(prototype?.path === R.PROTOTYPE_PATH && R.norm(prototype.template.templateId) === R.norm(R.IDS.pageTemplate), "Resource branch prototype changed.");
  assert(value(prototype, "__Renderings") === R.branchLayout(), "ResourceArticle branch layout differs; inspect it before provisioning.");
  for (const name of ["summary", "body", "state", ...M.METADATA]) assert(value(prototype, name) === "", "Resource branch prototype is no longer blank.");
  return home;
}

function validateManifest(manifest, origin) {
  assert(manifest.schemaVersion === 1 && manifest.scope === W.CONTENT_ROOT && manifest.origin === origin && Array.isArray(manifest.items) && Array.isArray(manifest.events), "Practice manifest belongs to a different environment or scope.");
  const paths = new Set();
  for (const item of manifest.items) {
    const spec = M.targets().find(target => target.path === item.path);
    assert(spec && !paths.has(item.path) && M.validId(item.itemId), "Practice manifest contains an unknown, duplicated or invalid item.");
    paths.add(item.path);
  }
}
async function run({ query, origin, apply = false, manifest, templateManifest, persist = () => {} }) {
  T.validateManifest(templateManifest, origin);
  assert(templateManifest.complete === true, "Complete isolated-template provisioning before creating pages.");
  const template = await T.verifyTemplate(query, templateManifest.template, await T.sourceDefinition(query));
  const journal = manifest || { schemaVersion: 1, scope: W.CONTENT_ROOT, origin, template, items: [], events: [] };
  validateManifest(journal, origin);
  assert.deepEqual(journal.template, template, "Practice content manifest belongs to a different template; use a fresh manifest after recycling old practice content.");
  await preflight(query);
  const workflow = await workflowIds(query);
  if (apply) assert(workflow.ids, "Provision and verify the workshop workflow before creating practice pages.");
  if (journal.workflow && workflow.ids) assert.deepEqual(journal.workflow, workflow.ids, "Recorded workshop workflow IDs changed.");
  const plans = [], inventory = new Map();
  const specs = M.targets(workflow.ids, template.itemId);
  for (const spec of specs) {
    const item = await read(query, { path: spec.path });
    const recorded = journal.items.find(entry => entry.path === spec.path);
    if (item) {
      identity(item, spec, recorded);
      inventory.set(spec.path, item);
    } else assert(!recorded, "A previously recorded practice item disappeared; do not recreate automatically.");
    plans.push({ path: spec.path, kind: spec.kind, pair: spec.pair, action: item ? "preserve-existing" : "create", itemId: item?.itemId || null });
  }
  // Refuse unrelated children before writing anywhere in this subtree.
  for (const item of inventory.values()) {
    assert(item.children.every(child => specs.some(spec => spec.path === child.path)), "An unexpected child exists in the practice subtree; preserve it and review scope.");
  }
  if (!apply) return { mode: "read-only", missingWorkflow: workflow.missing, plans, discovery: DISCOVERY, scope: "Create-only practice content. No publishing, resets, identity changes or template changes." };
  journal.workflow = workflow.ids;
  persist(journal);
  const record = event => { journal.events.push({ at: new Date().toISOString(), ...event }); persist(journal); };
  for (const spec of specs) {
    if (inventory.has(spec.path)) continue;
    M.assertTarget(spec, template.itemId);
    assert(!await read(query, { path: spec.path }), "Practice item appeared during apply; do not overwrite it.");
    const parent = await read(query, { path: spec.parentPath });
    assert(parent, "Practice parent is missing.");
    if (spec.parentPath !== W.SITE + "/Home") identity(parent, specs.find(candidate => candidate.path === spec.parentPath), journal.items.find(entry => entry.path === spec.parentPath));
    const input = { database: "master", language: "en", name: spec.path.split("/").at(-1), parent: parent.itemId, templateId: spec.templateId, fields: Object.entries(spec.fields).map(([name, fieldValue]) => ({ name, value: fieldValue })) };
    record({ phase: "create-intent", path: spec.path });
    const result = await query(CREATE, { input });
    const itemId = result.createItem?.item?.itemId;
    assert(M.validId(itemId), "Native create returned no confirmed ID. Read the path before any retry.");
    const recorded = { path: spec.path, kind: spec.kind, pair: spec.pair, itemId, complete: false };
    journal.items.push(recorded); persist(journal);
    const item = await read(query, { path: spec.path });
    identity(item, spec, recorded); assertFields(item, spec.fields);
    inventory.set(spec.path, item);
    if (!["page", "root"].includes(spec.kind)) recorded.complete = true;
    record({ phase: "create-verified", path: spec.path, itemId });
  }
  for (const spec of specs.filter(item => ["page", "root"].includes(item.kind))) {
    const recorded = journal.items.find(entry => entry.path === spec.path);
    const current = await read(query, { path: spec.path });
    identity(current, spec, recorded);
    if (recorded.complete) continue; // Never reset a participant's authored content.
    emptyLock(current);
    assert(current.versions.length === 1 && current.version === 1, "The unfinished practice page has author versions; preserve it.");
    for (const name of ["Title", "summary", "body", "__Workflow", "__Workflow state", "__Default workflow", "state", ...M.METADATA].filter(name => Object.hasOwn(spec.fields, name))) assert(value(current, name) === spec.fields[name], "An author changed the unfinished practice page; do not finalize it automatically.");
    const image = spec.kind === "page" ? inventory.get(spec.path + "/Data/Resource image") : undefined;
    const layout = M.pageLayout(spec.path, current.itemId, image?.itemId);
    assert([spec.fields["__Renderings"], layout].includes(value(current, "__Renderings")), "An unrecognized layout exists on the unfinished practice page.");
    assert(!value(current, "__Final Renderings"), "The unfinished practice page has authored final-layout changes.");
    if (value(current, "__Renderings") !== layout) {
      record({ phase: "layout-intent", path: spec.path, itemId: current.itemId });
      await query(UPDATE, { input: { database: "master", language: "en", version: current.version, itemId: current.itemId, fields: [{ name: "__Renderings", value: layout }, { name: "__Created", value: value(current, "__Created") }] } });
      const after = await read(query, { path: spec.path });
      identity(after, spec, recorded);
      assertFields(after, { ...spec.fields, "__Renderings": layout });
      assert(after.version === current.version && after.versions.length === current.versions.length, "Finalizing the new page unexpectedly changed its versions.");
    }
    recorded.complete = true;
    record({ phase: "layout-verified", path: spec.path, itemId: current.itemId });
  }
  journal.root = journal.items.find(item => item.kind === "root");
  journal.pages = journal.items.filter(item => item.kind === "page").map(({ pair, path, itemId }) => ({ pair, path, itemId }));
  persist(journal);
  return { mode: "applied", scope: W.CONTENT_ROOT, template, workflow: workflow.ids, root: journal.root, pages: journal.pages, itemCount: journal.items.length, published: false, discovery: DISCOVERY };
}

async function main(args = process.argv.slice(2)) {
  const [environment, ...rest] = args;
  assert(environment && !environment.startsWith("--"), "Specify the configured Sitecore environment.");
  let apply = false, file, templateFile;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--apply") { assert(!apply, "Duplicate apply flag."); apply = true; }
    else if (rest[i] === "--manifest") { assert(!file && rest[i + 1], "Supply exactly one manifest path."); file = rest[++i]; }
    else if (rest[i] === "--template-manifest") { assert(!templateFile && rest[i + 1], "Supply exactly one template manifest path."); templateFile = rest[++i]; }
    else throw new Error("Unknown practice-content option.");
  }
  assert(!apply || file, "Apply requires an external manifest to record native generated IDs.");
  assert(templateFile && path.isAbsolute(templateFile), "Use --template-manifest with the completed isolated-template manifest.");
  if (file) assert(path.isAbsolute(file) && !path.resolve(file).startsWith(ROOT + path.sep), "Manifest must be outside the repository.");
  const manifest = file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
  const templateManifest = JSON.parse(fs.readFileSync(templateFile, "utf8"));
  const { query, origin } = connection(environment, apply);
  console.log(JSON.stringify(await run({ query, origin, apply, manifest, templateManifest, persist: state => writePrivate(file, state) }), null, 2));
}
module.exports = { identity, assertFields, emptyLock, workflowIds, preflight, validateManifest, run, main };
if (require.main === module) main().catch(error => { console.error("Workshop practice: " + (error?.message || "Operation failed.")); process.exitCode = 1; });
