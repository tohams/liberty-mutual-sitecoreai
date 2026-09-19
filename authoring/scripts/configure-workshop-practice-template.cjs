#!/usr/bin/env node
"use strict";
/** Creates an isolated sibling page template. Default is read-only. Never publishes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { connection, read, value, writePrivate, ROOT } = require("./campaign-native-client.cjs");
const R = require("./resource-page-authoring-model.cjs");
const M = require("./workshop-practice-content-model.cjs");
const MARKER = "Liberty Mutual isolated workshop practice template v1";
const FIELD_NAMES = Object.freeze(["summary", "body", "resourceType", "state", "reviewedAt", "sourceLink", "businessFamily", "product", "channel"]);
// Native createItemTemplate serializes unchecked checkboxes as "0"; older
// serialized definitions use an empty value. Both are versioned, never "1".
const isVersioned = item => ["Shared", "Unversioned"].every(name => ["", "0"].includes(value(item, name)));

async function sourceDefinition(query) {
  const source = await read(query, { itemId: R.IDS.pageTemplate });
  assert(source?.path === R.TEMPLATES + "/ResourcePage" && R.norm(value(source, "__Base template")) === R.norm(R.IDS.portalPageTemplate), "ResourcePage must directly inherit only PortalPage.");
  const section = await read(query, { path: source.path + "/Content" });
  assert(section && section.children.length === FIELD_NAMES.length && FIELD_NAMES.every(name => section.children.some(child => child.name === name)), "ResourcePage field inventory differs.");
  const fields = [];
  for (const name of FIELD_NAMES) {
    const item = await read(query, { path: section.path + "/" + name });
    assert(item && isVersioned(item), "Workshop content fields must be versioned.");
    fields.push({ name, sourceFieldId: item.itemId, type: value(item, "Type"), source: value(item, "Source"), title: value(item, "Title"), tooltip: value(item, "__Short description"), sortOrder: Number(value(item, "__Sortorder") || "0"), versioning: "VERSIONED" });
  }
  return { sourceId: source.itemId, parentId: source.parent.itemId, baseTemplateId: R.IDS.portalPageTemplate, fields };
}
function validateManifest(manifest, origin) {
  assert(manifest?.schemaVersion === 1 && manifest.origin === origin && manifest.template?.path === M.TEMPLATE_PATH && M.validId(manifest.template.itemId) && R.norm(manifest.template.itemId) !== R.norm(R.IDS.pageTemplate), "Use the recorded isolated WorkshopPracticePage template manifest.");
}
async function verifyTemplate(query, template, source, allowUnmarked = false) {
  assert(template?.path === M.TEMPLATE_PATH && M.validId(template.itemId), "Unexpected workshop template identity.");
  const item = await read(query, { path: M.TEMPLATE_PATH });
  assert(item && R.norm(item.itemId) === R.norm(template.itemId) && R.norm(item.template.templateId) === "ab86861a603046c5b394e8f99e8b87db", "Workshop template native identity differs.");
  assert(R.norm(value(item, "__Base template")) === R.norm(R.IDS.portalPageTemplate), "WorkshopPracticePage must directly inherit only PortalPage, never ResourcePage.");
  assert(value(item, "__Short description") === MARKER || (allowUnmarked && !value(item, "__Short description")), "Workshop template ownership marker differs.");
  assert(item.children.every(child => ["Content", "__Standard Values"].includes(child.name)), "Workshop template contains unexpected children.");
  const section = await read(query, { path: M.TEMPLATE_PATH + "/Content" });
  assert(section && section.children.length === FIELD_NAMES.length && FIELD_NAMES.every(name => section.children.some(child => child.name === name)), "Workshop template field inventory differs.");
  const fields = [];
  for (const definition of source.fields) {
    const field = await read(query, { path: section.path + "/" + definition.name });
    assert(field && R.norm(field.itemId) !== R.norm(definition.sourceFieldId) && value(field, "Type") === definition.type && value(field, "Source") === definition.source && isVersioned(field), "Copied workshop field identity, type, source or versioning differs.");
    if (template.fields) assert(template.fields.some(record => record.name === definition.name && R.norm(record.itemId) === R.norm(field.itemId)), "Recorded workshop field ID differs.");
    fields.push({ name: definition.name, itemId: field.itemId, sourceFieldId: definition.sourceFieldId });
  }
  const standards = await read(query, { path: M.TEMPLATE_PATH + "/__Standard Values" });
  assert(standards && R.norm(standards.template.templateId) === R.norm(item.itemId), "Workshop standard values must belong to the isolated template.");
  return { itemId: item.itemId, path: item.path, baseTemplateId: R.IDS.portalPageTemplate, fields, standardValuesId: standards.itemId };
}
async function run({ query, origin, apply = false, manifest, persist = () => {} }) {
  const source = await sourceDefinition(query);
  const existing = await read(query, { path: M.TEMPLATE_PATH });
  if (existing) {
    validateManifest(manifest, origin);
    const template = await verifyTemplate(query, manifest.template, source, manifest.complete !== true);
    if (manifest.complete) return { mode: "verified", template, published: false };
    if (!apply) return { mode: "read-only", template, action: "complete-owned-template-marker", published: false };
  } else assert(!manifest, "Recorded template disappeared; do not recreate automatically.");
  if (!apply) return { mode: "read-only", action: "create-isolated-sibling-template", path: M.TEMPLATE_PATH, baseTemplateId: source.baseTemplateId, fields: source.fields.map(({ name, type, versioning }) => ({ name, type, versioning })), published: false };
  const journal = manifest || { schemaVersion: 1, origin, complete: false, events: [] };
  const record = event => { journal.events.push({ at: new Date().toISOString(), ...event }); persist(journal); };
  if (!existing) {
    record({ phase: "template-create-intent", path: M.TEMPLATE_PATH });
    const result = await query("mutation($input:CreateItemTemplateInput!){createItemTemplate(input:$input){itemTemplate{templateId}}}", { input: { database: "master", language: "en", parent: source.parentId, name: "WorkshopPracticePage", baseTemplates: [source.baseTemplateId], createStandardValuesItem: true, sections: [{ name: "Content", sortOrder: 100, fields: source.fields.map(({ sourceFieldId, ...field }) => field) }] } });
    const id = result.createItemTemplate?.itemTemplate?.templateId;
    assert(M.validId(id), "Template creation not confirmed; read the native path before retrying.");
    journal.template = { path: M.TEMPLATE_PATH, itemId: id }; persist(journal);
    journal.template = await verifyTemplate(query, journal.template, source, true); persist(journal);
    record({ phase: "template-create-verified", itemId: id });
  }
  const current = await read(query, { itemId: journal.template.itemId });
  if (value(current, "__Short description") !== MARKER) {
    record({ phase: "template-marker-intent", itemId: current.itemId });
    await query("mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}", { input: { database: "master", language: "en", version: current.version, itemId: current.itemId, fields: [{ name: "__Short description", value: MARKER }, { name: "__Created", value: value(current, "__Created") }] } });
  }
  journal.template = await verifyTemplate(query, journal.template, source);
  journal.complete = true; record({ phase: "template-complete", itemId: journal.template.itemId });
  return { mode: "applied", template: journal.template, published: false };
}
async function main(args = process.argv.slice(2)) {
  const [environment, ...rest] = args; let apply = false, file;
  assert(environment && !environment.startsWith("--"), "Specify the Sitecore CLI environment.");
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--apply") { assert(!apply); apply = true; }
    else if (rest[i] === "--manifest") { assert(!file && rest[i + 1]); file = rest[++i]; }
    else throw new Error("Unknown template option.");
  }
  assert(!apply || file, "Apply requires an external template manifest.");
  if (file) assert(path.isAbsolute(file) && !path.resolve(file).startsWith(ROOT + path.sep), "Template manifest must be outside Git.");
  const manifest = file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
  const { query, origin } = connection(environment, apply);
  console.log(JSON.stringify(await run({ query, origin, apply, manifest, persist: state => writePrivate(file, state) }), null, 2));
}
module.exports = { MARKER, FIELD_NAMES, isVersioned, sourceDefinition, validateManifest, verifyTemplate, run, main };
if (require.main === module) main().catch(error => { console.error("Workshop practice template: " + (error?.message || "Operation failed.")); process.exitCode = 1; });
