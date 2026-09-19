#!/usr/bin/env node
"use strict";
/**
 * Provision the isolated workshop roles, workflow and exact practice-page ACLs.
 * Read-only by default. This does not create users, assign accounts, publish,
 * reset content, grant administrator access, or modify Basic Workflow.
 *
 * Capture: ENV --snapshot /absolute/before.json [--content-manifest /absolute/content.json] [--migrate-publishing]
 * Review:  ENV --baseline /absolute/before.json
 * Apply:   ENV --baseline /absolute/before.json --apply --journal /absolute/journal.json --manifest /absolute/workflow.json
 *
 * Provision the workflow first, then give its manifest to the content seeder.
 * Capture a second baseline with the returned content manifest to add page ACLs.
 * GraphQL has no atomic revision precondition. Stop on uncertain writes; rerun
 * read-only capture/review before resuming. Never blindly retry a mutation.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const M = require("./workshop-editorial-workflow-model.cjs");
const { ROOT, connection, read, value, writePrivate } = require("./campaign-native-client.cjs");

const PAIRS = Object.freeze(Array.from({ length: 9 }, (_, i) => String(i + 1).padStart(2, "0")));
const META = new Set(["__Revision", "__Shared revision", "__Unversioned revision", "__Updated", "__Updated by"]);
const digest = data => crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
const plainFields = fields => Object.entries(fields).map(([name, value]) => ({ name, value }));
const sameNames = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const PUBLISHING_MIGRATION = "remove-workshop-approver-global-publishing";

function semantic(item, omitMetadata = true) {
  if (!item) return null;
  return {
    id: M.norm(item.itemId), path: item.path, template: M.norm(item.template.templateId),
    parent: M.norm(item.parent.itemId), version: item.version, language: item.language.name,
    versions: item.versions.map(v => `${v.language.name}:${v.version}`).sort(),
    fields: item.fields.filter(f => !omitMetadata || !META.has(f.name)).map(f => [M.norm(f.fieldId), f.name, f.value]).sort((a, b) => a[0].localeCompare(b[0])),
    children: item.children.map(child => [M.norm(child.itemId), child.path]).sort((a, b) => a[1].localeCompare(b[1])),
  };
}

function identity(item, spec) {
  assert(item && item.path === spec.path && M.norm(item.template.templateId) === M.norm(spec.template), "An owned path has an unexpected template or identity.");
  if (spec.id) assert.equal(M.norm(item.itemId), M.norm(spec.id), "An owned native item ID changed.");
  assert(item.language.name === "en", "Workshop provisioning uses English only.");
}

async function readRole(query, name) {
  const { role } = await query("query($name:String!){role(roleName:$name){name memberOf(indirect:false,first:100){nodes{name}pageInfo{hasNextPage}}}}", { name });
  if (!role) return null;
  assert(role.memberOf?.pageInfo?.hasNextPage === false, "Role membership inventory is incomplete.");
  assert.equal(role.name, name, "Role lookup returned a different identity.");
  return { name: role.name, memberOf: role.memberOf.nodes.map(x => x.name).sort() };
}

function validateRole(role, spec, migration = null) {
  if (!role) return;
  assert.equal(role.name, spec.name, "Unexpected workshop role.");
  const exactLegacyApprover = migration === PUBLISHING_MIGRATION && role.name === M.ROLES.approver && sameNames(role.memberOf, [...spec.memberOf, M.CLIENT_PUBLISHING]);
  assert(role.memberOf.every(name => spec.memberOf.includes(name)) || exactLegacyApprover, "Workshop role has unreviewed inherited privileges; only the exact legacy Approver parent set can use --migrate-publishing.");
}

function contentPages(manifest) {
  if (!manifest) return [];
  assert(Array.isArray(manifest.pages) && manifest.pages.length > 0 && manifest.pages.length <= 9, "Content manifest must contain 1–9 explicit practice pages.");
  M.contentTemplate(manifest.template);
  const pages = manifest.pages.map(page => M.contentSpec(page, manifest.template));
  assert(new Set(pages.map(x => x.pair)).size === pages.length && new Set(pages.map(x => M.norm(x.id))).size === pages.length, "Duplicate practice pair or item ID.");
  return pages;
}

function validateContentTemplate(item, spec) {
  assert.deepEqual(spec, M.contentTemplate({ path: spec.path, itemId: spec.id }), "Unexpected practice template scope.");
  identity(item, spec);
  const bases = value(item, "__Base template").split("|").filter(Boolean).map(M.norm);
  assert.deepEqual(bases, [M.norm(M.TEMPLATES.portalPage)], "WorkshopPracticePage must derive directly and only from PortalPage, not ResourcePage.");
}

async function verifyContentTemplate(query, evidence) {
  if (!evidence) return;
  const fresh = await read(query, { itemId: evidence.spec.id });
  validateContentTemplate(fresh, evidence.spec);
  assert.deepEqual(semantic(fresh, false), semantic(evidence.item, false), "Practice template changed after baseline capture.");
}

function nativeIds(items) {
  return Object.fromEntries(M.workflowSpecs().filter(spec => items[spec.key]).map(spec => [spec.key, items[spec.key].itemId]));
}

function validateWorkflowItem(item, spec, ids) {
  if (!item) return;
  identity(item, spec);
  assert(item.versions.length === 1 && item.versions[0].version === 1 && item.versions[0].language.name === "en", "Owned workflow configuration has unexpected versions; inspect before changing it.");
  assert(!value(item, "__Lock").trim() || /^<r\s*\/\s*>$/.test(value(item, "__Lock").trim()), "An owned configuration item is locked.");
  if (spec.key === "workflow") assert.equal(value(item, "__Short description"), M.MARKER, "Workflow name is already used by unowned configuration.");
  const expected = M.workflowSpecs(ids).find(x => x.key === spec.key);
  for (const [name, desired] of Object.entries(expected.fields)) {
    // An interrupted initial install can leave a reference blank. All other
    // nonempty configuration must match this workflow's reviewed model.
    const current = value(item, name);
    assert(current === desired || (Object.hasOwn(expected.references || {}, name) && current === ""), "Owned workflow configuration differs from the reviewed model; do not overwrite it.");
  }
  const known = new Set(M.workflowSpecs().filter(child => child.parent === spec.path).map(child => child.path));
  assert(item.children.every(child => known.has(child.path)), "Owned workflow contains additional configuration; preserve it and inspect before applying.");
}

async function capture(query, contentManifest = null, { migratePublishing = false } = {}) {
  assert(typeof migratePublishing === "boolean", "Unexpected publishing migration option.");
  const migration = migratePublishing ? PUBLISHING_MIGRATION : null;
  const pages = contentPages(contentManifest);
  let contentTemplate = null;
  if (pages.length) {
    const spec = M.contentTemplate(contentManifest.template);
    const item = await read(query, { itemId: spec.id });
    validateContentTemplate(item, spec);
    contentTemplate = { spec, item };
  }
  const workflow = {};
  for (const spec of M.workflowSpecs()) workflow[spec.key] = await read(query, { path: spec.path });
  const ids = nativeIds(workflow);
  for (const spec of M.workflowSpecs(ids)) validateWorkflowItem(workflow[spec.key], spec, ids);
  // Children cannot exist without their owned parent, nor may the same native
  // item appear at multiple declared paths.
  assert(new Set(Object.values(ids).map(M.norm)).size === Object.keys(ids).length, "Duplicate native workflow IDs.");
  const roles = [];
  for (const spec of M.roleSpecs(PAIRS)) {
    const item = await readRole(query, spec.name);
    validateRole(item, spec, migration);
    roles.push({ spec, item });
  }
  const content = [];
  for (const spec of pages) {
    assert(ids.workflow && ids.draft && ids.awaiting && ids.approved, "Install the workflow before capturing practice-page ACLs.");
    const item = await read(query, { itemId: spec.id });
    identity(item, spec);
    assert.equal(M.norm(value(item, "__Workflow")), M.norm(ids.workflow), "A practice page is bound to another workflow; leave it unchanged.");
    assert([ids.draft, ids.awaiting, ids.approved].map(M.norm).includes(M.norm(value(item, "__Workflow state"))), "Practice page has an unexpected workflow state.");
    content.push({ spec, item, after: M.mergeAcl(value(item, "__Security"), spec.acl) });
  }
  const data = { schemaVersion: 1, workflow, roles, content, contentTemplate, migration };
  return { ...data, sha256: digest(data) };
}

function validateSnapshot(before) {
  assert(before?.schemaVersion === 1 && before.workflow && Array.isArray(before.roles) && Array.isArray(before.content), "Unexpected workflow baseline.");
  const { sha256, ...data } = before;
  assert.equal(sha256, digest(data), "Workflow baseline checksum differs.");
  assert(before.migration === null || before.migration === undefined || before.migration === PUBLISHING_MIGRATION, "Unexpected publishing migration scope.");
  const specs = M.workflowSpecs(nativeIds(before.workflow));
  assert(sameNames(Object.keys(before.workflow), specs.map(x => x.key)), "Unexpected workflow baseline scope.");
  for (const spec of specs) validateWorkflowItem(before.workflow[spec.key], spec, nativeIds(before.workflow));
  assert.deepEqual(before.roles.map(x => x.spec), M.roleSpecs(PAIRS), "Unexpected role baseline scope.");
  for (const { spec, item } of before.roles) validateRole(item, spec, before.migration);
  assert(before.content.length ? before.contentTemplate : !before.contentTemplate, "Practice-page ACL baselines require dedicated template evidence.");
  if (before.contentTemplate) validateContentTemplate(before.contentTemplate.item, before.contentTemplate.spec);
  for (const { spec, item, after } of before.content) {
    assert.deepEqual(spec, M.contentSpec({ pair: spec.pair, path: spec.path, itemId: spec.id }, { path: before.contentTemplate.spec.path, itemId: before.contentTemplate.spec.id }), "Unexpected practice ACL scope.");
    identity(item, spec);
    assert.equal(after, M.mergeAcl(value(item, "__Security"), spec.acl), "Practice ACL differs from the scoped model.");
  }
}

function plan(before) {
  validateSnapshot(before);
  const ids = nativeIds(before.workflow);
  return {
    mode: "read-only", createsUsers: false, assignsUsers: false, publishes: false,
    migration: before.migration || null,
    roles: before.roles.map(({ spec, item }) => ({ name: spec.name, action: item ? "reconcile-reviewed-parent-roles" : "create", parentRoles: spec.memberOf, add: spec.memberOf.filter(name => !item?.memberOf.includes(name)), remove: (item?.memberOf || []).filter(name => !spec.memberOf.includes(name)) })),
    workflow: M.workflowSpecs(ids).map(spec => ({ path: spec.path, action: before.workflow[spec.key] ? "verify-and-configure-owned-acl" : "create", fields: spec.fields, references: spec.references || {}, acl: M.ownedAcl(spec.acl) })),
    contentTemplate: before.contentTemplate ? { path: before.contentTemplate.spec.path, itemId: before.contentTemplate.spec.id } : null,
    approvalPublishing: { type: M.PUBLISH_ACTION.type, parameters: M.PUBLISH_ACTION.parameters, manualPublishingRole: false },
    pages: before.content.map(({ spec, item, after }) => ({ path: spec.path, itemId: item.itemId, pair: spec.pair, action: value(item, "__Security") === after ? "unchanged" : "set-scoped-acl", before: value(item, "__Security"), after })),
    acceptanceRequired: "Use actual non-admin Author and Approver identities to verify page scope, submit/review commands, approval-triggered publication and disabled manual publishing. Item.access.canPublish and administrator/API success do not prove the UI publishing gate.",
  };
}

async function updateFields(query, item, fields, record) {
  if (!Object.keys(fields).length) return item;
  const fresh = await read(query, { itemId: item.itemId });
  assert.deepEqual(semantic(fresh, false), semantic(item, false), "Native item changed immediately before write.");
  record({ phase: "item-update-intent", path: item.path, itemId: item.itemId, fields });
  await query("mutation($input:UpdateItemInput!){updateItem(input:$input){item{itemId}}}", { input: { database: "master", language: "en", version: item.version, itemId: item.itemId, fields: [...plainFields(fields), { name: "__Created", value: value(item, "__Created") }] } });
  const after = await read(query, { itemId: item.itemId });
  for (const [name, desired] of Object.entries(fields)) assert.equal(value(after, name), desired, "Native field readback differs; stop and inspect the journal.");
  const compare = structuredClone(after);
  for (const name of Object.keys(fields)) {
    const field = compare.fields.find(x => x.name === name);
    assert(field, "Configured field is missing from readback.");
    field.value = value(item, name);
  }
  assert.deepEqual(semantic(compare), semantic(item), "A protected native field or item identity changed during update.");
  record({ phase: "item-update-verified", path: after.path, itemId: after.itemId });
  return after;
}

async function run({ query, before, apply = false, record = () => {} }) {
  const reviewed = plan(before);
  // Preflight every existing target before the first mutation.
  await verifyContentTemplate(query, before.contentTemplate);
  for (const { spec, item } of before.roles) assert.deepEqual(await readRole(query, spec.name), item, "Role membership changed after baseline capture.");
  for (const spec of M.workflowSpecs()) assert.deepEqual(semantic(await read(query, { path: spec.path }), false), semantic(before.workflow[spec.key], false), "Workflow changed after baseline capture.");
  for (const { spec, item } of before.content) assert.deepEqual(semantic(await read(query, { itemId: spec.id }), false), semantic(item, false), "Practice page changed after baseline capture.");
  if (!apply) return reviewed;

  for (const { spec, item } of before.roles) {
    let current = await readRole(query, spec.name);
    assert.deepEqual(current, item, "Role changed immediately before provisioning.");
    if (!current) {
      record({ phase: "role-create-intent", name: spec.name });
      const result = await query("mutation($input:CreateRoleInput!){createRole(input:$input){role{name}}}", { input: { roleName: spec.name } });
      assert.equal(result.createRole?.role?.name, spec.name, "Role creation was not confirmed.");
      current = await readRole(query, spec.name);
      assert(current && current.memberOf.length === 0, "Created role has unexpected inherited permissions.");
      record({ phase: "role-create-verified", name: spec.name });
    }
    const remove = current.memberOf.filter(name => !spec.memberOf.includes(name));
    if (remove.length) {
      assert(before.migration === PUBLISHING_MIGRATION && spec.name === M.ROLES.approver && sameNames(remove, [M.CLIENT_PUBLISHING]) && sameNames(current.memberOf, [...spec.memberOf, M.CLIENT_PUBLISHING]), "Only the reviewed legacy Approver publishing inheritance can be removed.");
      assert.deepEqual(await readRole(query, spec.name), current, "Role changed before removing global publishing access.");
      record({ phase: "role-publishing-removal-intent", name: spec.name, parentRoles: remove });
      const result = await query("mutation($input:DeleteRoleFromRolesInput!){deleteRoleFromRoles(input:$input){successful}}", { input: { roleName: spec.name, parentRoles: remove } });
      assert(result.deleteRoleFromRoles?.successful === true, "Global publishing inheritance removal was not confirmed.");
      current = await readRole(query, spec.name);
      assert(current && sameNames(current.memberOf, spec.memberOf), "Role readback differs after publishing inheritance removal.");
      record({ phase: "role-publishing-removal-verified", name: spec.name, parentRoles: current.memberOf });
    }
    const missing = spec.memberOf.filter(name => !current.memberOf.includes(name));
    if (missing.length) {
      assert.deepEqual(await readRole(query, spec.name), current, "Role changed before adding parent roles.");
      record({ phase: "role-parents-intent", name: spec.name, parentRoles: missing });
      const result = await query("mutation($input:AddRoleToRolesInput!){addRoleToRoles(input:$input){successful}}", { input: { roleName: spec.name, parentRoles: missing } });
      assert(result.addRoleToRoles?.successful === true, "Role inheritance update was not confirmed.");
      current = await readRole(query, spec.name);
      assert(sameNames(current.memberOf, spec.memberOf), "Role inheritance readback differs.");
      record({ phase: "role-parents-verified", name: spec.name });
    }
  }

  const items = structuredClone(before.workflow);
  // Root and states precede commands, so all command destinations are known.
  for (const definition of M.workflowSpecs()) {
    if (items[definition.key]) continue;
    const spec = M.workflowSpecs(nativeIds(items)).find(x => x.key === definition.key);
    assert.equal(await read(query, { path: spec.path }), null, "A new item appeared at an owned path; recapture the baseline.");
    const parent = await read(query, { path: spec.parent });
    assert(parent, "Native workflow parent is missing.");
    const fields = { ...spec.fields, "__Security": M.ownedAcl(spec.acl) };
    record({ phase: "item-create-intent", path: spec.path, template: spec.template, fields });
    const result = await query("mutation($input:CreateItemInput!){createItem(input:$input){item{itemId}}}", { input: { database: "master", language: "en", parent: parent.itemId, templateId: spec.template, name: spec.path.split("/").at(-1), fields: plainFields(fields) } });
    assert(result.createItem?.item?.itemId, "Workflow item creation was not confirmed.");
    const created = await read(query, { itemId: result.createItem.item.itemId });
    identity(created, spec);
    for (const [name, desired] of Object.entries(fields)) assert.equal(value(created, name), desired, "Created workflow item readback differs.");
    items[spec.key] = created;
    record({ phase: "item-create-verified", path: created.path, itemId: created.itemId });
  }
  const ids = nativeIds(items);
  for (const spec of M.workflowSpecs(ids)) {
    const current = await read(query, { itemId: items[spec.key].itemId });
    identity(current, { ...spec, id: items[spec.key].itemId });
    validateWorkflowItem(current, spec, ids);
    const desired = { ...spec.fields, "__Security": M.mergeAcl(value(current, "__Security"), spec.acl) };
    const changes = Object.fromEntries(Object.entries(desired).filter(([name, expected]) => value(current, name) !== expected));
    items[spec.key] = await updateFields(query, current, changes, record);
  }
  for (const { spec, item, after } of before.content) {
    await verifyContentTemplate(query, before.contentTemplate);
    const current = await read(query, { itemId: spec.id });
    assert.deepEqual(semantic(current, false), semantic(item, false), "Practice page changed while workflow was provisioned.");
    if (value(item, "__Security") !== after) await updateFields(query, item, { "__Security": after }, record);
  }
  return {
    schemaVersion: 1, mode: "applied", workflowId: ids.workflow, draftId: ids.draft, awaitingId: ids.awaiting, approvedId: ids.approved,
    commandIds: { submit: ids.submit, approve: ids.approve, reject: ids.reject }, workflowPath: M.WORKFLOW_ROOT,
    approvalPublishing: { actionId: ids.publish, ...reviewed.approvalPublishing },
    contentRoot: M.CONTENT_ROOT, roles: { ...M.ROLES, pairs: Object.fromEntries(PAIRS.map(number => [number, M.pairRole(number)])) },
    template: reviewed.contentTemplate,
    pages: before.content.map(({ spec }) => ({ pair: spec.pair, path: spec.path, itemId: spec.id })),
    usersCreated: 0, usersAssigned: 0, published: false,
    acceptanceRequired: reviewed.acceptanceRequired,
  };
}

function privatePath(file) {
  assert(path.isAbsolute(file) && !path.resolve(file).startsWith(ROOT + path.sep), "Keep baselines, journals and native manifests outside the repository.");
  return file;
}
function writeNew(file, data) {
  privatePath(file);
  assert(!fs.existsSync(file), "Refuse to replace an existing baseline or manifest.");
  writePrivate(file, data);
}
async function main(args = process.argv.slice(2)) {
  const [environment, ...rest] = args, options = {};
  assert(environment && !environment.startsWith("--"), "Specify a Sitecore CLI environment.");
  for (let i = 0; i < rest.length; i++) {
    const key = rest[i];
    assert(!Object.hasOwn(options, key), "Duplicate option.");
    if (key === "--apply" || key === "--migrate-publishing") options[key] = true;
    else {
      assert(["--snapshot", "--baseline", "--content-manifest", "--journal", "--manifest"].includes(key) && rest[i + 1] && !rest[i + 1].startsWith("--"), "Unknown or incomplete option.");
      options[key] = privatePath(rest[++i]);
    }
  }
  const apply = options["--apply"] === true;
  const { query, origin } = connection(environment, apply);
  if (options["--snapshot"]) {
    assert(!apply && !options["--baseline"] && !options["--journal"] && !options["--manifest"], "Capture is a separate read-only operation.");
    const content = options["--content-manifest"] ? JSON.parse(fs.readFileSync(options["--content-manifest"], "utf8")) : null;
    const before = await capture(query, content, { migratePublishing: options["--migrate-publishing"] === true });
    writeNew(options["--snapshot"], { environment, origin, capturedAt: new Date().toISOString(), before });
    console.log(JSON.stringify({ mode: "captured", file: options["--snapshot"], ...plan(before) }, null, 2));
    return;
  }
  assert(options["--baseline"] && !options["--content-manifest"] && !options["--migrate-publishing"], "Review/apply requires a captured baseline; content and the publishing migration are reviewed during capture.");
  const document = JSON.parse(fs.readFileSync(options["--baseline"], "utf8"));
  assert(document.origin === origin && document.environment.toLowerCase() === environment.toLowerCase(), "Baseline belongs to a different environment.");
  let record = () => {};
  if (apply) {
    assert(options["--journal"] && options["--manifest"] && new Set([options["--baseline"], options["--journal"], options["--manifest"]]).size === 3, "Apply needs distinct journal and manifest files.");
    assert(!fs.existsSync(options["--journal"]) && !fs.existsSync(options["--manifest"]), "Use new journal/manifest paths after reviewing current state.");
    const journal = { schemaVersion: 1, origin, baselineSha256: document.before.sha256, events: [] };
    record = event => { journal.events.push({ at: new Date().toISOString(), ...event }); writePrivate(options["--journal"], journal); };
  } else assert(!options["--journal"] && !options["--manifest"], "Read-only review does not write a journal/manifest.");
  const result = await run({ query, before: document.before, apply, record });
  if (apply) writeNew(options["--manifest"], { ...result, origin, environment, appliedAt: new Date().toISOString() });
  console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { PAIRS, PUBLISHING_MIGRATION, semantic, identity, readRole, validateRole, contentPages, validateContentTemplate, verifyContentTemplate, nativeIds, capture, validateSnapshot, plan, updateFields, run, main };
