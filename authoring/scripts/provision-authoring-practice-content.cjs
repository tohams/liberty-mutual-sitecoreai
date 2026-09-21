#!/usr/bin/env node
"use strict";
/**
 * Create independent campaign practice pages for the workshop manifest and their local data.
 * Defaults to read-only. Apply performs createItem only: no updates, publishing,
 * role changes, shared-model edits, resets, or native version creation.
 *
 * Review: node authoring/scripts/provision-authoring-practice-content.cjs ENV
 * Apply:  node authoring/scripts/provision-authoring-practice-content.cjs ENV --apply --manifest /absolute/private/authoring-practice.json
 * Resume/review: use the same --manifest, adding --apply only to create missing items.
 * Extend: add --numbers 16,17,18,19,20 to require every item outside those pages to exist.
 * Keep the external manifest: it records native IDs and establishes ownership.
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { connection, read, value, writePrivate, ROOT } = require("./campaign-native-client.cjs");
const C = require("./campaign-authoring-model.cjs");
const M = require("./authoring-practice-content-model.cjs");
const CREATE = "mutation($input:CreateItemInput!){createItem(input:$input){item{itemId}}}";
const DEFINITION = "ab86861a-6030-46c5-b394-e8f99e8b87db";
const FIELD = "455a3e98-a627-4b40-8035-e683a0331ac7";
const HOME_ID = "ae9e45ca-f127-4abe-9ca7-2ff109981998";
const HOME_TEMPLATE = "2ec94e3d-439c-4fc6-bd4e-f08c7ddd9203";
function sameId(a, b) { return M.validId(a) && M.validId(b) && C.norm(a) === C.norm(b); }
function ids(raw) {
  const result = raw ? raw.split("|") : [];
  assert(result.every(M.validId), "Expected a native GUID set in the campaign authoring configuration.");
  return result.map(C.norm).sort();
}
function equalIdSet(actual, expected, message) { assert.deepEqual(ids(actual), ids(expected), message); }
function recordFields(record) {
  return Object.fromEntries([
    ...(record.SharedFields || []),
    ...(record.Languages?.[0]?.Fields || []),
    ...(record.Languages?.[0]?.Versions?.[0]?.Fields || []),
  ].map(field => [field.Hint, String(field.Value)]));
}
function nativeVersioned(item, label) {
  assert(["", "0"].includes(value(item, "Shared")) && ["", "0"].includes(value(item, "Unversioned")), `${label} must remain a native versioned field.`);
}
async function preflight(query) {
  const home = await read(query, { path: C.SITE + "/Home" });
  assert(home && sameId(home.itemId, HOME_ID) && sameId(home.template.templateId, HOME_TEMPLATE), "Unexpected site Home identity or template; no writes permitted.");
  const folder = await read(query, { itemId: M.FOLDER_TEMPLATE });
  assert(folder?.path === "/sitecore/templates/Common/Folder" && sameId(folder.itemId, M.FOLDER_TEMPLATE) && sameId(folder.template.templateId, DEFINITION), "The native Common/Folder template is missing or incompatible.");
  const portal = await read(query, { itemId: C.IDS.portalPage });
  assert(portal?.path === C.TP + "/PortalPage" && sameId(portal.template.templateId, DEFINITION), "The existing PortalPage template is missing or incompatible.");
  for (const [name, fieldId] of [["Title", C.F.title], ["NavigationTitle", C.F.navigation]]) {
    const field = await read(query, { itemId: fieldId });
    assert(field?.name === name && sameId(field.template.templateId, FIELD) && value(field, "Type") === "Single-Line Text", `The existing ${name} field is incompatible.`);
    nativeVersioned(field, name);
  }
  const native = new Map();
  for (const record of C.modelRecords()) {
    const item = await read(query, { path: record.Path });
    assert(item && sameId(item.itemId, record.ID) && sameId(item.template.templateId, record.Template), `Install the reviewed campaign model first: ${record.Path}`);
    native.set(record.Path, item);
    const expected = recordFields(record);
    if (sameId(record.Template, DEFINITION)) {
      equalIdSet(value(item, "__Base template"), expected["__Base template"], `Campaign template base differs: ${record.Path}`);
      assert(sameId(value(item, "__Standard values"), expected["__Standard values"]), `Campaign template standard values differ: ${record.Path}`);
    }
    if (sameId(record.Template, FIELD)) {
      assert(value(item, "Type") === expected.Type, `Campaign field type differs: ${record.Path}`);
      nativeVersioned(item, record.Path);
    }
    if (record.Path.endsWith("/__Standard Values")) {
      for (const name of ["__Masters", "__Default workflow"].filter(name => Object.hasOwn(expected, name))) equalIdSet(value(item, name), expected[name], `Campaign standard-value ${name} differs: ${record.Path}`);
    }
  }
  for (const [key, components] of Object.entries(C.PLACEHOLDERS)) {
    for (const scope of [C.PP, C.SP]) {
      const item = native.get(scope + "/" + key);
      assert(value(item, "Placeholder Key") === key + (key === "headless-campaign-page" ? "" : "-{*}"), `Campaign placeholder key differs: ${scope}/${key}`);
      equalIdSet(value(item, "Allowed Controls"), components.map(component => M.idField(C.uid(C.RP + "/" + component))).join("|"), `Campaign placeholder allowlist differs: ${scope}/${key}`);
    }
  }
  for (const name of ["CampaignPage", ...Object.keys(C.COMPONENTS)]) {
    const item = native.get(C.RP + "/" + name);
    assert(value(item, "componentName") === name, `Campaign rendering component differs: ${name}`);
    assert(sameId(value(item, "Parameters Template"), C.IDS.parameters), `Campaign rendering parameters template differs: ${name}`);
    equalIdSet(value(item, "AllowedOnTemplates"), M.idField(C.uid(C.TP + "/CampaignPage")), `Campaign rendering allowed template differs: ${name}`);
    if (name === "CampaignPage") {
      equalIdSet(value(item, "Placeholders"), Object.keys(C.PLACEHOLDERS).slice(1).map(key => M.idField(C.uid(C.PP + "/" + key))).join("|"), "CampaignPage child placeholder configuration differs.");
      assert(value(item, "OtherProperties") === "IsRenderingsWithDynamicPlaceholders=true", "CampaignPage dynamic placeholder configuration differs.");
    } else {
      const template = value(item, "Datasource Template");
      assert(template === C.TP + "/" + name || sameId(template, C.uid(C.TP + "/" + name)), `Campaign datasource template differs: ${name}`);
      assert(value(item, "Datasource Location") === "query:./Data", `Campaign datasource location must remain page-local: ${name}`);
    }
  }
  const layout = native.get(C.LP + "/CampaignLayout");
  assert(value(layout, "Path") === "/Views/SXA JSS/SXA JSS Layout.cshtml", "CampaignLayout path differs.");
  equalIdSet(value(layout, "Placeholders"), M.idField(C.uid(C.PP + "/headless-campaign-page")), "CampaignLayout root placeholder differs.");
  for (const [workflowId, draftId] of [[C.IDS.workflow, C.IDS.draft], [C.IDS.datasourceWorkflow, C.IDS.datasourceDraft]]) {
    const workflow = await read(query, { itemId: workflowId });
    const draft = await read(query, { itemId: draftId });
    assert(workflow && sameId(workflow.itemId, workflowId) && sameId(workflow.template.templateId, "1c0acc50-37be-4742-b43c-96a07a7410a5"), "The existing campaign workflow is unavailable or incompatible.");
    assert(draft && sameId(draft.itemId, draftId) && sameId(draft.template.templateId, "4b7e2da9-de43-4c83-88c3-02f042031d04") && sameId(draft.parent.itemId, workflowId) && draft.name === "Draft" && ["", "0"].includes(value(draft, "Final")), "The existing campaign Draft state is unavailable or incompatible.");
  }
  return { homeId: home.itemId, campaignModelItems: native.size, placeholderScopes: [C.PP, C.SP], datasourceLocation: "query:./Data", verified: true };
}
function identity(item, spec, recorded) {
  assert(item && item.path === spec.path && item.parent.path === spec.parentPath && sameId(item.template.templateId, spec.templateId), "Practice item path, parent or template differs.");
  assert(recorded && sameId(recorded.itemId, item.itemId), "Existing practice content requires its recorded manifest ID; never adopt an unrelated item.");
  assert(value(item, "__Short description") === M.MARKER, "Practice ownership marker differs; preserve the item and inspect it.");
}
function validateManifest(manifest, origin) {
  assert(manifest?.schemaVersion === 1 && manifest.origin === origin && manifest.scope === M.ROOT_PATH && [M.CONTRACT_SHA256, M.LEGACY_CONTRACT_SHA256].includes(manifest.contractSha256) && Array.isArray(manifest.items) && Array.isArray(manifest.events), "Practice manifest belongs to a different environment, scope or contract.");
  const legacy = manifest.contractSha256 !== M.CONTRACT_SHA256;
  const specs = M.targets().filter(spec => !legacy || !spec.number || M.LEGACY_NUMBERS.includes(spec.number)), seenPaths = new Set(), seenIds = new Set();
  for (const item of manifest.items) {
    const spec = specs.find(target => target.path === item.path);
    assert(spec && !seenPaths.has(item.path) && M.validId(item.itemId) && !seenIds.has(C.norm(item.itemId)) && item.kind === spec.kind && item.number === spec.number && typeof item.complete === "boolean", "Practice manifest contains an unknown, duplicated or invalid item.");
    seenPaths.add(item.path); seenIds.add(C.norm(item.itemId));
  }
}
async function run({ query, origin, apply = false, manifest, numbers, persist = () => {} }) {
  assert(typeof origin === "string" && new URL(origin).protocol === "https:", "HTTPS authoring origin required.");
  if (numbers !== undefined) {
    assert(Array.isArray(numbers) && numbers.length && new Set(numbers).size === numbers.length && numbers.every(number => M.NUMBERS.includes(number)), "Select distinct practice numbers from the workshop manifest.");
    assert(manifest, "Scoped extension requires the recorded native manifest.");
  }
  const journal = manifest || { schemaVersion: 1, origin, scope: M.ROOT_PATH, contractSha256: M.CONTRACT_SHA256, items: [], events: [] };
  validateManifest(journal, origin);
  const checks = await preflight(query);
  const specs = M.targets(), inventory = new Map(), plans = [];
  // Inventory every bounded target before the first write, including collisions
  // late in the tree. Only recorded native IDs establish ownership on resume.
  for (const spec of specs) {
    const item = await read(query, { path: spec.path });
    const recorded = journal.items.find(entry => entry.path === spec.path);
    if (item) { identity(item, spec, recorded); inventory.set(spec.path, item); }
    else {
      assert(!recorded, "A recorded practice item disappeared; do not recreate it automatically.");
      assert(!numbers || numbers.includes(spec.number), "A practice item outside the selected numbers is missing; scoped extension cannot recreate it.");
    }
    plans.push({ path: spec.path, kind: spec.kind, number: spec.number, action: item ? "preserve-existing" : "create", itemId: item?.itemId || null });
  }
  if (!apply) return { mode: "read-only", scope: M.ROOT_PATH, preflight: checks, plans, published: false };
  if (journal.contractSha256 !== M.CONTRACT_SHA256) {
    journal.events.push({ at: new Date().toISOString(), phase: "contract-extended", previousContractSha256: journal.contractSha256, contractSha256: M.CONTRACT_SHA256 });
    journal.contractSha256 = M.CONTRACT_SHA256;
  }
  persist(journal);
  const record = event => { journal.events.push({ at: new Date().toISOString(), ...event }); persist(journal); };
  let createdCount = 0;
  for (const spec of specs) {
    if (inventory.has(spec.path)) {
      // Native create is the only mutation. Confirmed IDs remain preserved even
      // if interrupted readback was followed by legitimate author changes.
      const recorded = journal.items.find(entry => entry.path === spec.path);
      if (!recorded.complete) { recorded.complete = true; record({ phase: "existing-preserved", path: spec.path, itemId: recorded.itemId }); }
      continue;
    }
    assert(!await read(query, { path: spec.path }), "Practice item appeared during apply; do not overwrite it.");
    const parent = await read(query, { path: spec.parentPath });
    assert(parent, "Practice parent is missing.");
    if (spec.kind === "root") assert(sameId(parent.itemId, checks.homeId), "The site Home identity changed during apply.");
    else identity(parent, specs.find(candidate => candidate.path === spec.parentPath), journal.items.find(entry => entry.path === spec.parentPath));
    record({ phase: "create-intent", path: spec.path });
    const result = await query(CREATE, { input: {
      database: "master", language: "en", parent: parent.itemId, templateId: spec.templateId,
      name: spec.path.split("/").at(-1), fields: Object.entries(spec.fields).map(([name, fieldValue]) => ({ name, value: fieldValue })),
    } });
    const itemId = result.createItem?.item?.itemId;
    assert(M.validId(itemId), "Native create returned no confirmed ID. Inspect the path before retrying.");
    const recorded = { path: spec.path, kind: spec.kind, number: spec.number, itemId, complete: false };
    journal.items.push(recorded); persist(journal); // Save a confirmed native ID before readback or another create.
    const item = await read(query, { path: spec.path });
    identity(item, spec, recorded);
    for (const [name, expected] of Object.entries(spec.fields)) assert(value(item, name) === expected, `Created practice field ${name} differs; stop and inspect the recorded item.`);
    assert(item.version === 1 && item.versions.length === 1 && item.language.name === "en", "New practice content has unexpected native versions.");
    recorded.complete = true; inventory.set(spec.path, item); createdCount++;
    record({ phase: "create-verified", path: spec.path, itemId });
  }
  const root = journal.items.find(item => item.kind === "root");
  const pages = journal.items.filter(item => item.kind === "page").map(({ number, path, itemId }) => ({ number, path, itemId }));
  journal.complete = true; persist(journal);
  return { mode: "applied", scope: M.ROOT_PATH, preflight: checks, root, pages, itemCount: journal.items.length, createdCount, preservedCount: specs.length - createdCount, published: false };
}
function manifestPath(file) {
  assert(file && path.isAbsolute(file), "Use an absolute external manifest path.");
  const resolved = path.resolve(file), parent = fs.realpathSync(path.dirname(resolved));
  const canonical = path.join(parent, path.basename(resolved));
  const repository = fs.realpathSync(ROOT);
  assert(canonical !== repository && !canonical.startsWith(repository + path.sep), "Manifest must be outside the repository.");
  assert(!fs.existsSync(canonical) || !fs.lstatSync(canonical).isSymbolicLink(), "Manifest must be a regular file, not a symbolic link.");
  return canonical;
}
function persistManifest(file, state) {
  const temporary = file + ".tmp-" + process.pid;
  writePrivate(temporary, state);
  fs.renameSync(temporary, file);
}
async function main(args = process.argv.slice(2)) {
  const [environment, ...rest] = args;
  assert(environment && !environment.startsWith("--"), "Specify the configured Sitecore environment.");
  let apply = false, file, numbers;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--apply") { assert(!apply, "Duplicate apply flag."); apply = true; }
    else if (rest[i] === "--manifest") { assert(!file && rest[i + 1] && !rest[i + 1].startsWith("--"), "Supply exactly one manifest path."); file = manifestPath(rest[++i]); }
    else if (rest[i] === "--numbers") { assert(!numbers && rest[i + 1] && !rest[i + 1].startsWith("--"), "Supply exactly one comma-separated practice-number selection."); numbers = rest[++i].split(","); }
    else throw new Error("Unknown authoring-practice option.");
  }
  assert(!apply || file, "Apply requires an external manifest to record generated native IDs.");
  const manifest = file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
  const { query, origin } = connection(environment, apply);
  console.log(JSON.stringify(await run({ query, origin, apply, manifest, numbers, persist: state => persistManifest(file, state) }), null, 2));
}
module.exports = { preflight, identity, validateManifest, run, manifestPath, main };
if (require.main === module) main().catch(error => { console.error("Authoring practice: " + (error?.message || "Operation failed.")); process.exitCode = 1; });
